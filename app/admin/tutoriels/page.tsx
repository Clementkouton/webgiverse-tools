// app/admin/tutoriels/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Contrôle des TUTORIELS depuis la console admin :
//   • 4 tuiles de statistiques (tutos, vues, en cours, terminés)
//     avec pastilles pastel « TailwindAdmin » (indigo, info, ambre,
//     menthe) ;
//   • tableau complet : niveau, durée, vues, progressions ;
//   • actions : basculer le badge « Nouveau », supprimer (confirmé).
// Tableau épuré, pastilles douces, interrupteurs indigo.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, MonitorPlay, PlayCircle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  basculerTutoNouveauFormulaire,
  supprimerTutoFormulaire,
} from "@/app/actions/admin";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
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
        vues: true, nouveau: true,
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
          La collection vidéo réservée aux abonnés Premium : popularité, progression des membres et actions rapides.
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

      {/* ── Tableau des tutoriels ───────────────────────────────────── */}
      <Carte className="animate-apparition-haut delai-2 mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-5 py-3">Tutoriel</th>
              <th className="px-3 py-3">Niveau</th>
              <th className="px-3 py-3">Durée</th>
              <th className="px-3 py-3">Vues</th>
              <th className="px-3 py-3">Progressions</th>
              <th className="px-3 py-3">Nouveau</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {tutos.map((t) => (
              <tr key={t.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                <td className="max-w-80 px-5 py-3.5">
                  <Link href={`/tutoriels/${t.slug}`} className="block truncate font-semibold text-adm-sombre hover:text-primaire-texte">
                    {t.titre}
                  </Link>
                  <span className="text-[12px] leading-4 text-encre">/tutoriels/{t.slug}</span>
                </td>
                <td className="px-3 py-3.5">
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] leading-4 font-semibold", NIVEAU[t.niveau])}>
                    {LIBELLE_NIVEAU[t.niveau] ?? t.niveau}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-encre">{duree(t.dureeMin)}</td>
                <td className="px-3 py-3.5 font-semibold text-primaire-texte tabular-nums">{t.vues}</td>
                <td className="px-3 py-3.5 text-encre tabular-nums">{t._count.progressions}</td>
                <td className="px-3 py-3.5">
                  <form action={basculerTutoNouveauFormulaire}>
                    <input type="hidden" name="tutoId" value={t.id} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={t.nouveau}
                      aria-label={`Badge nouveau : ${t.titre}`}
                      className={cn(
                        "relative h-6 w-10 shrink-0 rounded-full transition",
                        t.nouveau ? "bg-primaire" : "bg-adm-bordure",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                          t.nouveau ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <BoutonConfirmer
                    message={`Supprimer définitivement « ${t.titre} » ? Les progressions des membres seront perdues.`}
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-300 bg-white px-3 text-[13px] leading-4 font-semibold text-red-700 transition hover:bg-red-50"
                    type="submit"
                  >
                    Supprimer
                  </BoutonConfirmer>
                </td>
              </tr>
            ))}
            {tutos.length === 0 && (
              <tr>
                <td colSpan={7} className="p-0">
                  <EtatVideAdmin
                    icone={GraduationCap}
                    ton="info"
                    titre="Aucun tutoriel pour l'instant"
                    description="Crée le premier tutoriel pour alimenter la section Apprendre."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>
    </div>
  );
}