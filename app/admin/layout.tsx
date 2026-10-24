// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MenuAdmin from "@/components/admin/menu-admin";
import { BoutonDeconnexion } from "@/components/auth/bouton-deconnexion";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/admin");

  // Vérification directe en base : fonctionne même si le jeton a été créé
  // avant la promotion en admin (pas besoin de se reconnecter).
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, email: true, image: true },
  });
  if (moi?.role !== "ADMIN") redirect("/dashboard");

  // Nombre de propositions d'outils en attente → badge animé du menu
  const propositionsEnAttente = await prisma.toolSubmission.count({
    where: { statut: "EN_ATTENTE" },
  });

  return (
    <MenuAdmin
      prenom={moi.name ?? moi.email ?? ""}
      image={session.user.image ?? null}
      propositionsEnAttente={propositionsEnAttente}
      pied={<BoutonDeconnexion />}
    >
      {children}
    </MenuAdmin>
  );
}