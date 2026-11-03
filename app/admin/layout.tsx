// app/admin/layout.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Le layout calcule les NOTIFICATIONS ADMIN RÉELLES (cloche)
// en plus des propositions en attente (badge du menu) :
//   • propositions d'outils en attente   → /admin/moderation
//   • messages de contact non traités    → /admin/moderation
//   • nouveaux avis (24 h)               → /admin/avis
//   • nouvelles inscriptions (24 h)      → /admin/utilisateurs
//   • paiements réussis (24 h, avec montant) → /admin/abonnements
// Chaque notification est cliquable ; rien ne s'affiche quand il n'y
// a rien à traiter (état « tout est à jour » dans la cloche).
// ─────────────────────────────────────────────────────────────────
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MenuAdmin from "@/components/admin/menu-admin";
import type { NotificationAdmin } from "@/components/admin/cloche-admin";
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

  // ── Événements à afficher dans la cloche ─────────────────────────
  const ilYa24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ilYa15min = new Date(Date.now() - 15 * 60 * 1000);

  const [
    nbPropositions, nbMessages, nbAvis24h, nbInscriptions24h,
    paiements24h, propositionsRecentes,
  ] = await Promise.all([
    prisma.toolSubmission.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.messageContact.count({ where: { traite: false } }),
    prisma.avis.count({ where: { creeLe: { gte: ilYa24h } } }),
    prisma.user.count({ where: { createdAt: { gte: ilYa24h } } }),
    prisma.paiement.findMany({
      where: { statut: "PAYE", majLe: { gte: ilYa24h } },
      select: { montant: true, plan: true },
    }),
    prisma.toolSubmission.findMany({
      where: { statut: "EN_ATTENTE", createdAt: { gte: ilYa15min } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, nom: true },
    }),
  ]);

  const notifications: NotificationAdmin[] = [];
  if (nbPropositions > 0) {
    const details = propositionsRecentes.length
      ? propositionsRecentes.map((p) => p.nom).join(", ")
      : `${nbPropositions} proposition(s) à modérer`;
    notifications.push({
      id: "propositions",
      type: "proposition",
      titre: `${nbPropositions} proposition${nbPropositions > 1 ? "s" : ""} d'outil${nbPropositions > 1 ? "s" : ""}`,
      message: details,
      lien: "/admin/propositions",
    });
  }
  if (nbMessages > 0) {
    notifications.push({
      id: "contacts",
      type: "contact",
      titre: `${nbMessages} message${nbMessages > 1 ? "s" : ""} de contact`,
      message: "À lire et à marquer comme traité",
      lien: "/admin/moderation",
    });
  }
  if (nbAvis24h > 0) {
    notifications.push({
      id: "avis",
      type: "avis",
      titre: `${nbAvis24h} nouvel${nbAvis24h > 1 ? "s" : ""} avis`,
      message: "Déposé(s) sur le site ces dernières 24 h",
      lien: "/admin/avis",
    });
  }
  if (nbInscriptions24h > 0) {
    notifications.push({
      id: "inscriptions",
      type: "inscription",
      titre: `${nbInscriptions24h} nouvelle${nbInscriptions24h > 1 ? "s" : ""} inscription${nbInscriptions24h > 1 ? "s" : ""}`,
      message: "Membre(s) inscrit(s) ces dernières 24 h",
      lien: "/admin/utilisateurs",
    });
  }
  if (paiements24h.length > 0) {
    const totalCentimes = paiements24h.reduce((somme, p) => somme + p.montant, 0);
    notifications.push({
      id: "paiements",
      type: "paiement",
      titre: `${paiements24h.length} paiement${paiements24h.length > 1 ? "s" : ""} réussi${paiements24h.length > 1 ? "s" : ""}`,
      message: `+ ${(totalCentimes / 100).toFixed(2)} $ de Premium encaissé (24 h)`,
      lien: "/admin/abonnements",
    });
  }

  return (
    <MenuAdmin
      prenom={moi.name ?? moi.email ?? ""}
      image={session.user.image ?? null}
      propositionsEnAttente={nbPropositions}
      notifications={notifications}
      pied={<BoutonDeconnexion />}
    >
      {children}
    </MenuAdmin>
  );
}
