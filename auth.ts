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
          role: utilisateur.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        // Propage le rôle dans le jeton : Google renvoie l'utilisateur complet de la base,
        // et le fournisseur Credentials le renvoie désormais (champ « role » dans authorize).
        (token as any).role = (user as any).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role ?? "USER";
      }
      return session;
    },
  },
});