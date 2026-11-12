// app/admin/tutoriels/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Contrôle des TUTORIELS depuis la console admin :
//   • tuiles de statistiques conservées (tutos, vues, en cours,
//     terminés) ;
//   • NOUVEAU : colonne « N° » = RANG D'AJOUT du tutoriel (1 = le
//     premier ajouté, dernier = le plus récent) — le numéro reste
//     stable quel que soit le tri affiché ;
//   • NOUVEAU : barre de tri (liens ?tri=…) — ordre par défaut,
//     AJOUT ancien→récent / récent→ancien (pour repérer et supprimer
//     les derniers tutoriels ajoutés), titre A→Z / Z→A, vues, durée,
//     progressions. Le tri est fait DANS CETTE PAGE (searchParams +
//     tri en mémoire) : le composant partagé GestionListeAdmin n'est
//     pas modifié → aucune autre page admin n'est impactée ;
//   • tableau toujours géré par GestionListeAdmin : recherche par
//     mots, filtre par niveau, sélections rapides, suppression en
//     masse — inchangé.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ListFilter, MonitorPlay, PlayCircle, CheckCircle2 } from "lucide-react";
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

/* ── Lot 35 — LES TRIS DISPONIBLES ──────────────────────────────
   Clé = paramètre d'URL (?tri=…). « editorial » = ordre actuel de la
   base (champ ordre, comme avant) : c'est le tri par défaut, donc
   l'affichage ne change pas tant qu'on ne choisit rien. */
const TRIS = {
  editorial: {
    libelle: "Ordre par défaut",
    desc: "Ordre de pertinence géré dans la base (comme avant le lot 35).",
  },
  "ajout-asc": {
    libelle: "Ajout : ancien → récent",
    desc: "Les premiers tutoriels ajoutés apparaissent en haut.",
  },
  "ajout-desc": {
    libelle: "Ajout : récent → ancien",
    desc: "Les derniers tutoriels ajoutés apparaissent en haut — pratique pour les repérer et les supprimer en masse.",
  },
  az: {
    libelle: "A → Z",
    desc: "Classement alphabétique croissant par titre.",
  },
  za: {
    libelle: "Z → A",
    desc: "Classement alphabétique décroissant par titre.",
  },
  "vues-desc": {
    libelle: "Plus vues",
    desc: "Les tutoriels les plus vus en premier.",
  },
  "vues-asc": {
    libelle: "Moins vues",
    desc: "Les tutoriels les moins vus en premier.",
  },
  "duree-desc": {
    libelle: "Plus longues",
    desc: "Les tutoriels les plus longs en premier.",
  },
  "duree-asc": {
    libelle: "Plus courtes",
    desc: "Les tutoriels les plus courts en premier.",
  },
  "progressions-desc": {
    libelle: "Plus suivis",
    desc: "Les tutoriels avec le plus de progressions (En cours + Terminé) en premier.",
  },
} as const;

type Tri = keyof typeof TRIS;

/** Forme d'une ligne du tableau (résultat du findMany ci-dessous). */
type TutoListe = {
  id: string;
  slug: string;
  titre: string;
  niveau: string;
  dureeMin: number;
  vues: number;
  nouveau: boolean;
  outils: string[];
  creeLe: Date;
  _count: { progressions: number };
};

/** Comparateur en mémoire pour chaque tri (jamais « editorial » : ordre conservé). */
function comparateur(tri: Tri): (a: TutoListe, b: TutoListe) => number {
  switch (tri) {
    case "ajout-asc":
      return (a, b) => a.creeLe.getTime() - b.creeLe.getTime() || a.id.localeCompare(b.id);
    case "ajout-desc":
      return (a, b) => b.creeLe.getTime() - a.creeLe.getTime() || a.id.localeCompare(b.id);
    case "az":
      return (a, b) => a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" });
    case "za":
      return (a, b) => b.titre.localeCompare(a.titre, "fr", { sensitivity: "base" });
    case "vues-desc":
      return (a, b) => b.vues - a.vues;
    case "vues-asc":
      return (a, b) => a.vues - b.vues;
    case "duree-desc":
      return (a, b) => b.dureeMin - a.dureeMin;
    case "duree-asc":
      return (a, b) => a.dureeMin - b.dureeMin;
    case "progressions-desc":
      return (a, b) => b._count.progressions - a._count.progressions;
    default:
      return () => 0;
  }
}

function duree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const reste = min % 60;
  return reste > 0 ? `${h} h ${reste}` : `${h} h`;
}

export default async function PageTutorielsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ── Tri choisi via l'URL (?tri=…), « editorial » par défaut ─────
  const brut = (await searchParams).tri;
  const tri: Tri = typeof brut === "string" && brut in TRIS ? (brut as Tri) : "editorial";

  const [tutos, vuesTotales, progressions, nbTermines] = await Promise.all([
    prisma.tuto.findMany({
      orderBy: [{ ordre: "asc" }, { creeLe: "desc" }],
      select: {
        id: true, slug: true, titre: true, niveau: true, dureeMin: true,
        vues: true, nouveau: true, outils: true, creeLe: true,
        _count: { select: { progressions: true } },
      },
    }),
    prisma.tuto.aggregate({ _sum: { vues: true } }),
    prisma.progressionTuto.findMany({ where: { statut: "EN_COURS" }, select: { id: true } }),
    prisma.progressionTuto.findMany({ where: { statut: "TERMINE" }, select: { id: true } }),
  ]);

  // ── Lot 35 — RANG D'AJOUT de chaque tutoriel (stable) ───────────
  // 1 = le premier tutoriel ajouté dans la base, N = le plus récent.
  // Calculé une seule fois, indépendamment du tri affiché : le N°
  // reste donc le même quel que soit l'ordre choisi.
  const rangAjout = new Map<string, number>();
  [...tutos]
    .sort((a, b) => a.creeLe.getTime() - b.creeLe.getTime() || a.id.localeCompare(b.id))
    .forEach((t, i) => rangAjout.set(t.id, i + 1));

  // ── Liste AFFICHÉE = mêmes données, triées selon le choix ───────
  const tutosAffiches: TutoListe[] =
    tri === "editorial" ? (tutos as TutoListe[]) : [...tutos].sort(comparateur(tri));

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
          La collection vidéo réservée aux abonnés Premium : recherche par mots, filtres, sélection multiple, suppression en masse — et désormais la numérotation par ordre d&apos;ajout avec tris croissants / décroissants.
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

      {/* ── Lot 35 — Barre de tri (liens, aucune modif du composant
          partagé) : le tri choisi est mis en surbrillance ─────────── */}
      <section className="mt-4 flex flex-wrap items-center gap-2" aria-label="Trier les tutoriels">
        <span className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold text-adm-gris">
          <ListFilter className="size-4" aria-hidden /> Trier :
        </span>
        {(Object.keys(TRIS) as Tri[]).map((cle) => {
          const actif = cle === tri;
          return (
            <Link
              key={cle}
              href={`/admin/tutoriels?tri=${cle}`}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-[7px] -skew-x-[18deg] border px-3 py-1.5 text-[12.5px] leading-4 font-medium transition",
                actif
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-black/10 bg-white text-adm-gris hover:border-indigo-300 hover:text-adm-sombre",
              )}
            >
              {TRIS[cle].libelle}
            </Link>
          );
        })}
      </section>
      <p className="mt-2 text-[12.5px] leading-5 text-adm-gris">
        {TRIS[tri].desc} — la colonne <strong className="font-semibold text-adm-sombre">N°</strong> est le
        rang d&apos;ajout (1 = premier tutoriel ajouté, {tutos.length} = le plus récent) ; il ne change
        pas quand tu tries.
      </p>

      {/* ── Tableau géré (recherche, filtres, sélection, masse) ────── */}
      <div className="animate-apparition-haut delai-2 mt-4">
        <GestionListeAdmin
          libelleTerme="tutoriel"
          colonnes={["N°", "Durée", "Vues", "Progressions"]}
          actionSupprimerMasse={supprimerTutorielsMasseAction}
          actionBasculerNouveau={basculerTutoNouveauFormulaire}
          champId="tutoId"
          filtres={[{ champ: "niveau", label: "Niveau" }]}
          items={tutosAffiches.map((t) => ({
            id: t.id,
            titre: t.titre,
            href: `/tutoriels/${t.slug}`,
            sousTitre: `/tutoriels/${t.slug}`,
            badges: [{ label: LIBELLE_NIVEAU[t.niveau] ?? t.niveau, classe: NIVEAU[t.niveau] ?? "bg-adm-fond text-adm-gris" }],
            cellules: [
              String(rangAjout.get(t.id) ?? "—"),
              duree(t.dureeMin),
              String(t.vues),
              String(t._count.progressions),
            ],
            recherche: `${t.titre} ${t.outils.join(" ")} ${LIBELLE_NIVEAU[t.niveau] ?? t.niveau} ${t.slug}`,
            filtres: { niveau: LIBELLE_NIVEAU[t.niveau] ?? t.niveau },
            nouveau: t.nouveau,
          }))}
        />
      </div>
    </div>
  );
}