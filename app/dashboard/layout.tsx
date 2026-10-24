import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif } from "@/lib/premium";
import ExigeConnexion from "@/components/auth/exige-connexion";
import MenuDashboard from "@/components/dashboard/menu-dashboard";
import { BoutonDeconnexion } from "@/components/auth/bouton-deconnexion";

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return <ExigeConnexion suite="/dashboard" />;
  }

  // Application des plans : statut Premium réel (défensif si table absente)
  const premium = await premiumActif(session.user.id);

  return (
    <Suspense fallback={null}>
      <MenuDashboard
        prenom={session.user.name ?? ""}
        image={session.user.image ?? null}
        premium={premium}
        pied={<BoutonDeconnexion />}
      >
        {children}
      </MenuDashboard>
    </Suspense>
  );
}