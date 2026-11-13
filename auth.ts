// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { envoyerEmail, emailBienvenue } from "@/lib/email";
import { lireImpersonation } from "@/lib/impersonation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      name: "E-mail et mot de passe",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(identifiants) {
        const email =
          typeof identifiants?.email === "string" ? identifiants.email.toLowerCase().trim() : "";
        const motDePasse = typeof identifiants?.password === "string" ? identifiants.password : "";
        if (!email || !motDePasse) return null;

        const utilisateur = await prisma.user.findUnique({ where: { email } });
        if (!utilisateur?.motDePasse) return null;
        // Lot 35 — un compte suspendu ou banni ne peut plus se connecter
        // (le message dédié est affiché par connexionAction qui vérifie
        // le statut AVANT d'appeler signIn ; ce contrôle est la barrière
        // de sécurité au niveau du fournisseur).
        if (utilisateur.statut !== "ACTIF") return null;
        const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
        if (!valide) return null;
        return {
          id: utilisateur.id,
          name: utilisateur.name,
          email: utilisateur.email,
          image: utilisateur.image,
          role: utilisateur.role,
        };
      },
    }),
  ],
  events: {
    // Nouveau compte créé par l'adaptateur (inscriptions Google) → email de
    // bienvenue. Les inscriptions par formulaire passent par inscriptionAction
    // (création manuelle, hors adaptateur) et envoient déjà leur propre email :
    // les deux chemins sont disjoints, aucun risque de doublon.
    createUser: async ({ user }) => {
      if (user?.email) {
        await envoyerEmail({
          a: user.email,
          sujet: "Bienvenue sur Webgiverse !",
          html: emailBienvenue(user.name),
        });
      }
    },
  },
  callbacks: {
    // Lot 35 — bloque la connexion Google des comptes suspendus / bannis.
    async signIn({ user }) {
      if (!user?.email) return true;
      const compte = await prisma.user
        .findUnique({ where: { email: user.email.toLowerCase() }, select: { statut: true } })
        .catch(() => null);
      return !compte || compte.statut === "ACTIF";
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        // Propage le rôle dans le jeton : Google renvoie l'utilisateur complet de la base,
        // et le fournisseur Credentials le renvoie désormais (champ « role » dans authorize).
        (token as any).role = (user as any).role ?? "USER";
        (token as any).dv = Date.now();
        return token;
      }

      // ── Lot 35/82 — Impersonation (« Se connecter en tant que… ») ──
      // Le cookie signé wg-impersonation remplace l'identité exposée par
      // le jeton : la cible devient l'utilisateur courant (id, rôle,
      // e-mail, nom, image), sans toucher à la vraie session de l'admin.
      //
      // Lot 82 — DEUX CORRECTIFS :
      //   1. L'e-mail et le nom de la cible étaient laissés tels quels :
      //      pendant une impersonation, session.user.email restait celui
      //      de l'ADMIN → getAdmin() (qui lit l'e-mail) laissait l'admin
      //      continuer à utiliser les actions admin en naviguant « en
      //      tant que » membre. L'identité est maintenant remplacée
      //      ENTIÈREMENT : l'impersonation donne exactement les droits
      //      de la cible, pas un de plus.
      //   2. Quand le cookie disparaît (bouton « Revenir », expiration
      //      2 h, cible suspendue), l'identité d'origine de l'admin est
      //      RESTAURÉE depuis la copie « orig » mémorisée au premier
      //      passage — avant, le jeton gardait définitivement l'identité
      //      de la cible.
      const impersonation = await lireImpersonation();
      if (impersonation) {
        // Mémorise l'identité d'origine une seule fois, au début.
        if (!(token as any).orig) {
          (token as any).orig = {
            id: (token as any).id,
            role: (token as any).role,
            email: (token as any).email,
            name: (token as any).name,
            picture: (token as any).picture,
          };
        }
        const cible = await prisma.user
          .findUnique({
            where: { id: impersonation.cibleId },
            select: {
              id: true, role: true, statut: true,
              email: true, name: true, image: true,
            },
          })
          .catch(() => null);
        if (cible && cible.statut === "ACTIF") {
          (token as any).id = cible.id;
          (token as any).role = cible.role;
          (token as any).email = cible.email;
          (token as any).name = cible.name;
          (token as any).picture = cible.image;
          (token as any).imp = impersonation.adminId;
          return token;
        }
        // Cible supprimée ou suspendue entre-temps → fin d'impersonation,
        // retour à l'identité de l'admin (sans le déconnecter).
        restaurerIdentite(token);
        return token;
      }

      if ((token as any).imp) {
        // Le cookie d'impersonation a disparu (bouton « Revenir » ou
        // expiration des 2 h) → restaure l'identité d'origine.
        restaurerIdentite(token);
      }

      // ── Lot 35 — Suspension / bannissement : invalidation des sessions ──
      // Le statut du compte est revérifié en base au maximum une fois par
      // minute par session (champ dv = date de dernière vérification).
      // Un compte suspendu ou banni est déconnecté immédiatement partout.
      const id = (token as any).id as string | undefined;
      const derniereVerification = (token as any).dv as number | undefined;
      if (id && (!derniereVerification || Date.now() - derniereVerification > 60_000)) {
        (token as any).dv = Date.now();
        const compte = await prisma.user
          .findUnique({ where: { id }, select: { role: true, statut: true } })
          .catch(() => null);
        if (compte) {
          if (compte.statut !== "ACTIF") return null; // session révoquée
          (token as any).role = compte.role; // rôle toujours à jour en base
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role ?? "USER";
        // Lot 35 — exposé au bandeau rouge : identifiant de l'admin
        // qui a démarré la session de support (null sinon).
        (session.user as any).impersonnePar = (token as any).imp ?? null;
      }
      return session;
    },
  },
});

/** Lot 82 — remet dans le jeton l'identité mémorisée avant
 *  l'impersonation, puis efface les marqueurs de support. */
function restaurerIdentite(token: Record<string, unknown>) {
  const orig = (token as any).orig as
    | { id?: unknown; role?: unknown; email?: unknown; name?: unknown; picture?: unknown }
    | undefined;
  if (orig) {
    (token as any).id = orig.id;
    (token as any).role = orig.role;
    (token as any).email = orig.email;
    (token as any).name = orig.name;
    (token as any).picture = orig.picture;
  }
  delete (token as any).imp;
  delete (token as any).orig;
}