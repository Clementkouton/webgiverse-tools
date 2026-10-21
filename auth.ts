// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

        const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
        if (!valide) return null;

        return {
          id: utilisateur.id,
          name: utilisateur.name,
          email: utilisateur.email,
          image: utilisateur.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).id = (token as any).id;
      return session;
    },
  },
});