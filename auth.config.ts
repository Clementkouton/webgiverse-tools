// auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/connexion" },
  session: { strategy: "jwt" },
  providers: [], // complétés dans auth.ts (Prisma est incompatible edge)
  callbacks: {
    authorized({ request, auth }) {
      const chemin = request.nextUrl.pathname;
      if (!chemin.startsWith("/dashboard") && !chemin.startsWith("/admin")) return true;

      // ── Server Actions : on laisse passer leurs POST ─────────────
      // Une Server Action POSTe vers l'URL de la page affichée
      // (/admin/import, /dashboard/…) et se signale par l'en-tête
      // « Next-Action ». Si la session a expiré entre la navigation et
      // l'envoi, la redirection vers /connexion renvoyait au client une
      // page HTML au lieu du résultat de l'action → erreur cryptique
      // « An unexpected response was received from the server » (E394).
      // On laisse donc CES POST-là arriver jusqu'à l'action, qui
      // vérifie elle-même le rôle (exigerAdmin / getAdmin) et renvoie
      // via useActionState le message propre « Accès réservé aux
      // administrateurs. », géré par l'interface.
      //
      // Lot 82 — LE FREIN AVAIT UNE PORTE TROP GRANDE : l'ancien test
      // `request.method === "POST"` laissait passer TOUT POST, même sans
      // en-tête « Next-Action » (requête forgée sans aucune session).
      // Désormais : POST de Server Action → passe ; tout autre POST est
      // traité comme une navigation et exige une session valide. Les
      // formulaires sans JavaScript (soumission progressive) passent
      // toujours : ils émanent d'utilisateurs connectés.
      if (request.method === "POST" && request.headers.has("Next-Action")) return true;

      if (!auth?.user) {
        const url = new URL("/connexion", request.nextUrl);
        url.searchParams.set("suite", chemin);
        return Response.redirect(url);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;