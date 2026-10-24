// app/dashboard/layout.tsx
// ─────────────────────────────────────────────────────────────────
// Layout du dashboard : protège TOUTES les pages de l'espace membre
// (dashboard, abonnement…) et nourrit le menu latéral avec les
// informations du membre (prénom, avatar, plan actif).
// ─────────────────────────────────────────────────────────────────
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { obtenirEtatPlan } from "@/lib/premium";
import ExigeConnexion from "@/components/auth/exige-connexion";
import MenuLateral from "@/components/dashboard/menu-lateral";

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return <ExigeConnexion suite="/dashboard" />;
  }

  const userId = session.user.id;

  // Prénom + avatar (lecture défensive : jamais de crash).
  const utilisateur = await prisma.user
    .findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    })
    .catch(() => null);
  const prenom = (utilisateur?.name ?? "").trim().split(/\s+/)[0] ?? "";

  // Plan actif (Découverte / Pro / Entreprise) — lib/premium.ts.
  const etatPlan = await obtenirEtatPlan(userId);

  return (
    <div className="min-h-[70vh]">
      {/* Suspense : le menu lit l'URL (?onglet=…) côté client. */}
      <Suspense fallback={null}>
        <MenuLateral
          prenom={prenom}
          image={session.user.image ?? utilisateur?.image ?? null}
          nomPlan={etatPlan.nomAffiche}
          premium={etatPlan.premium}
        />
      </Suspense>

      {/* Sur desktop, on décale le contenu de la largeur du menu. */}
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}