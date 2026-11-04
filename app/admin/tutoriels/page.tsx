// app/admin/tutoriels/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 34 — Contrôle des TUTORIELS depuis la console admin :
//   • tuiles de statistiques conservées (tutos, vues, en cours,
//     terminés) ;
//   • tableau géré par GestionListeAdmin : recherche PAR MOTS (ordre
//     libre, accents ignorés), filtre par niveau, cases à cocher avec
//     sélections rapides (40 / 150 / 200) et suppression EN MASSE ;
//   • actions par ligne : bascule du badge « Nouveau » (réparée : le
//     bouton était hors formulaire) et suppression (unitaire ou masse).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { GraduationCap, MonitorPlay, PlayCircle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import {
  basculerTutoNouveauFormulaire,
  supprimerTutorielsMasseAction,
} from "@/app/actions/admin";
import { GestionListeAdmin } from "@/components/admin/gestion-liste-admin";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tutoriels — Administration" };
export const dynamic = "force-dynamic";

const NIVEAU: Record<string, string> = {
  DEBUTANT: "bg-adm-info-doux text-[#2b6be0]",
  INTERMEDIAIRE: "bg-adm-alerte-doux text-[#b26f00]",
  AVANCE: "bg-adm-erreur-doux text-[#c94f35]",
};
const LIBELLE_NIVEAU: Record<string, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
};

function duree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const reste = min % 60;
  return reste > 0 ? `${h} h ${reste}` : `${h} h`;
}

export default async function PageTutorielsAdmin() {
  const [tutos, vuesTotales, progressions, nbTermines] = await Promise.all([
    prisma.tuto.findMany({
      orderBy: [{ ordre: "asc" }, { creeLe: "desc" }],
      select: {
        id: true, slug: true, titre: true, niveau: true, dureeMin: true,
        vues: true, nouveau: true, outils: true,
        _count: { select: { progressions: true } },
      },
    }),
    prisma.tuto.aggregate({ _sum: { vues: true } }),
    prisma.progressionTuto.findMany({ where: { statut: "EN_COURS" }, select: { id: true } }),
    prisma.progressionTuto.findMany({ where: { statut: "TERMINE" }, select: { id: true } }),
  ]);

  const TUILES: { libelle: string; valeur: number; icone: typeof MonitorPlay; ton: Ton }[] = [
    { libelle: "Tutoriels", valeur: tutos.length, icone: MonitorPlay, ton: "primaire" },
    { libelle: "Vues cumulées", valeur: vuesTotales._sum.vues ?? 0, icone: PlayCircle, ton: "info" },
    { libelle: "En cours de visionnage", valeur: progressions.length, icone: GraduationCap, ton: "alerte" },
    { libelle: "Tutoriels terminés", valeur: nbTermines.length, icone: CheckCircle2, ton: "succes" },
  ];

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Tutoriels</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          La collection vidéo réservée aux abonnés Premium : recherche par mots, filtres, sélection multiple et suppression en masse.
        </p>
      </div>

      {/* ── Tuiles de statistiques ──────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TUILES.map((t, i) => (
          <Carte
            key={t.libelle}
            className="animate-apparition-haut flex items-center gap-4 p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE_TUILE[t.ton])}>
              <t.icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">{t.valeur}</span>
              <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{t.libelle}</span>
            </span>
          </Carte>
        ))}
      </section>

      {/* ── Tableau géré (recherche, filtres, sélection, masse) ────── */}
      <div className="animate-apparition-haut delai-2 mt-4">
        <GestionListeAdmin
          libelleTerme="tutoriel"
          colonnes={["Durée", "Vues", "Progressions"]}
          actionSupprimerMasse={supprimerTutorielsMasseAction}
          actionBasculerNouveau={basculerTutoNouveauFormulaire}
          champId="tutoId"
          filtres={[{ champ: "niveau", label: "Niveau" }]}
          items={tutos.map((t) => ({
            id: t.id,
            titre: t.titre,
            href: `/tutoriels/${t.slug}`,
            sousTitre: `/tutoriels/${t.slug}`,
            badges: [{ label: LIBELLE_NIVEAU[t.niveau] ?? t.niveau, classe: NIVEAU[t.niveau] ?? "bg-adm-fond text-adm-gris" }],
            cellules: [duree(t.dureeMin), String(t.vues), String(t._count.progressions)],
            recherche: `${t.titre} ${t.outils.join(" ")} ${LIBELLE_NIVEAU[t.niveau] ?? t.niveau} ${t.slug}`,
            filtres: { niveau: LIBELLE_NIVEAU[t.niveau] ?? t.niveau },
            nouveau: t.nouveau,
          }))}
        />
      </div>
    </div>
  );
}
