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
      if (!auth?.user) {
        const url = new URL("/connexion", request.nextUrl);
        url.searchParams.set("suite", chemin);
        return Response.redirect(url);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;