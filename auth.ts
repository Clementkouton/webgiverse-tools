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

      // ── Lot 35 — Impersonation (« Se connecter en tant que… ») ──────
      // Le cookie signé wg-impersonation remplace l'identité exposée par
      // le jeton : la cible devient l'utilisateur courant (id + rôle),
      // sans toucher à la vraie session de l'admin. Si la cible est
      // suspendue entre-temps, l'impersonation s'éteint d'elle-même.
      const impersonation = await lireImpersonation();
      if (impersonation) {
        const cible = await prisma.user
          .findUnique({
            where: { id: impersonation.cibleId },
            select: { id: true, role: true, statut: true },
          })
          .catch(() => null);
        if (cible && cible.statut === "ACTIF") {
          (token as any).id = cible.id;
          (token as any).role = cible.role;
          (token as any).imp = impersonation.adminId;
          return token;
        }
      } else if ((token as any).imp) {
        delete (token as any).imp;
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
