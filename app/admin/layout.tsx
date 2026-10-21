// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavAdmin } from "@/components/admin/nav-admin";
import { ShieldCheck } from "lucide-react";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/admin");

  // Vérification directe en base : fonctionne même si le jeton a été créé
  // avant la promotion en admin (pas besoin de se reconnecter).
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, email: true },
  });
  if (moi?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[13px] leading-5 font-semibold tracking-wide text-violet uppercase">
            <ShieldCheck className="size-4" aria-hidden />
            Espace administrateur
          </p>
          <h1 className="mt-1 text-h2 font-titre font-semibold">
            Salut {moi.name || moi.email} 👋
          </h1>
        </div>
      </div>

      <NavAdmin />

      <main className="mt-8">{children}</main>
    </div>
  );
}