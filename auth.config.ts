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

      // ── Server Actions : on laisse passer les POST ────────────────
      // Une Server Action POSTe vers l'URL de la page affichée
      // (/admin/import, /dashboard/…). Si la session a expiré entre la
      // navigation et l'envoi, la redirection vers /connexion renvoyait
      // au client une page HTML au lieu du résultat de l'action →
      // erreur cryptique « An unexpected response was received from
      // the server » (E394) sans aucune explication. On laisse donc le
      // POST arriver jusqu'à l'action, qui vérifie elle-même le rôle
      // (exigerAdmin) et renvoie via useActionState le message propre
      // « Accès réservé aux administrateurs. », géré par l'interface.
      // Les GET (navigation) restent, eux, protégés par la redirection.
      if (request.method === "POST") return true;

      if (!auth?.user) {
        const url = new URL("/connexion", request.nextUrl);
        url.searchParams.set("suite", chemin);
        return Response.redirect(url);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;