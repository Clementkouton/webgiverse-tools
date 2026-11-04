// app/admin/sponsors/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Slots sponsorisés (admin) : réserver un emplacement
// « À la une » sur l'accueil ou une catégorie, avec dates de début/fin,
// activation, suivi des impressions / clics / CTR.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import {
  creerSponsorFormulaire,
  majSponsorFormulaire,
  basculerSponsorFormulaire,
  supprimerSponsorFormulaire,
  remettreStatsSponsorFormulaire,
} from "@/app/actions/sponsors";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Sponsors — Administration" };
export const dynamic = "force-dynamic";

const CLASSE_CHAMP =
  "w-full rounded-champ border border-bordure bg-white px-3 py-2 text-[14px] leading-5 text-bleu outline-none focus:border-violet";

/** Formulaire partagé création / modification. */
function FormulaireSponsor({
  action,
  sponsor,
  categories,
}: {
  action: (donnees: FormData) => void | Promise<void>;
  sponsor?: {
    id: string;
    titre: string;
    description: string;
    url: string;
    imageUrl: string | null;
    emplacement: string;
    categorieId: string | null;
    debutLe: Date;
    finLe: Date;
    note: string | null;
  };
  categories: { id: string; nom: string }[];
}) {
  return (
    <form action={action} className="grid gap-3">
      {sponsor && <input type="hidden" name="sponsorId" value={sponsor.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Titre affiché
          <input name="titre" required minLength={3} maxLength={80} defaultValue={sponsor?.titre} className={CLASSE_CHAMP} />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          URL de destination
          <input name="url" required type="url" placeholder="https://…" defaultValue={sponsor?.url} className={CLASSE_CHAMP} />
        </label>
      </div>
      <label className="grid gap-1 text-[13px] font-semibold text-bleu">
        Description (1–2 phrases)
        <input name="description" maxLength={200} defaultValue={sponsor?.description ?? ""} className={CLASSE_CHAMP} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Image (facultatif, carré 112 px conseillé)
          <input name="imageUrl" type="url" placeholder="https://…png" defaultValue={sponsor?.imageUrl ?? ""} className={CLASSE_CHAMP} />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Note interne (annonceur, tarif…)
          <input name="note" maxLength={300} defaultValue={sponsor?.note ?? ""} className={CLASSE_CHAMP} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Emplacement
          <select name="emplacement" defaultValue={sponsor?.emplacement ?? "ACCUEIL"} className={CLASSE_CHAMP}>
            <option value="ACCUEIL">Accueil (À la une)</option>
            <option value="CATEGORIE">Page d&apos;une catégorie</option>
          </select>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Catégorie (si emplacement catégorie)
          <select name="categorieId" defaultValue={sponsor?.categorieId ?? ""} className={CLASSE_CHAMP}>
            <option value="">— Choisir une catégorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Début de diffusion
          <input
            name="debutLe"
            type="datetime-local"
            defaultValue={sponsor ? new Date(sponsor.debutLe).toISOString().slice(0, 16) : ""}
            className={CLASSE_CHAMP}
          />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Fin de diffusion
          <input
            name="finLe"
            type="datetime-local"
            defaultValue={sponsor ? new Date(sponsor.finLe).toISOString().slice(0, 16) : ""}
            className={CLASSE_CHAMP}
          />
        </label>
      </div>
      <div>
        <Bouton taille="sm" type="submit">
          {sponsor ? "Enregistrer les modifications" : "Réserver ce slot"}
        </Bouton>
      </div>
    </form>
  );
}

export default async function PageSponsorsAdmin() {
  const [sponsors, categories] = await Promise.all([
    prisma.sponsor.findMany({
      include: { categorie: { select: { nom: true, slug: true } } },
      orderBy: { creeLe: "desc" },
    }),
    prisma.category.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  const maintenant = new Date();

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-h3 font-semibold">Slots sponsorisés</h2>
        <p className="mt-1 text-[14px] leading-5 text-encre">
          Un bandeau « À la une » apparaît sur l&apos;accueil ou en haut d&apos;une catégorie pendant
          la période de diffusion. Impressions et clics sont comptés automatiquement (CTR visible).
        </p>
      </div>

      {/* ── Nouveau slot ──────────────────────────────────────────── */}
      <Carte className="p-5">
        <h3 className="font-titre text-[16px] font-semibold">Réserver un slot</h3>
        <div className="mt-4">
          <FormulaireSponsor action={creerSponsorFormulaire} categories={categories} />
        </div>
      </Carte>

      {/* ── Liste ─────────────────────────────────────────────────── */}
      <div className="grid gap-4">
        {sponsors.map((s) => {
          const enCours = s.actif && s.debutLe <= maintenant && s.finLe >= maintenant;
          const ctr = s.impressions > 0 ? ((s.clics / s.impressions) * 100).toFixed(1) : "0.0";
          return (
            <Carte key={s.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-titre text-[16px] font-semibold">{s.titre}</h3>
                    {enCours ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">En diffusion</Badge>
                    ) : s.actif ? (
                      <Badge>Programmé / terminé</Badge>
                    ) : (
                      <Badge className="border-red-200 bg-red-50 text-red-700">En pause</Badge>
                    )}
                    <Badge variante="source">
                      {s.emplacement === "ACCUEIL" ? "Accueil" : `Catégorie : ${s.categorie?.nom ?? "?"}`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[14px] text-encre">{s.description}</p>
                  <p className="mt-1 text-[13px] text-encre">
                    {formatteDate(s.debutLe)} → {formatteDate(s.finLe)} ·{" "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">
                      {s.url.slice(0, 60)}…
                    </a>
                    {s.note && ` · ${s.note}`}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-champ bg-gris px-4 py-2">
                    <dt className="text-[11px] font-semibold uppercase text-encre">Impressions</dt>
                    <dd className="font-titre text-[18px] font-bold text-violet">{s.impressions}</dd>
                  </div>
                  <div className="rounded-champ bg-gris px-4 py-2">
                    <dt className="text-[11px] font-semibold uppercase text-encre">Clics</dt>
                    <dd className="font-titre text-[18px] font-bold text-violet">{s.clics}</dd>
                  </div>
                  <div className="rounded-champ bg-gris px-4 py-2">
                    <dt className="text-[11px] font-semibold uppercase text-encre">CTR</dt>
                    <dd className="font-titre text-[18px] font-bold text-violet">{ctr} %</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={basculerSponsorFormulaire}>
                  <input type="hidden" name="sponsorId" value={s.id} />
                  <Bouton taille="sm" variante="secondaire" type="submit">
                    {s.actif ? "Mettre en pause" : "Activer"}
                  </Bouton>
                </form>
                <form action={remettreStatsSponsorFormulaire}>
                  <input type="hidden" name="sponsorId" value={s.id} />
                  <Bouton taille="sm" variante="secondaire" type="submit">Remettre les stats à zéro</Bouton>
                </form>
                <form action={supprimerSponsorFormulaire}>
                  <input type="hidden" name="sponsorId" value={s.id} />
                  <Bouton taille="sm" variante="danger" type="submit">Supprimer</Bouton>
                </form>
              </div>

              {/* Modification dépliable */}
              <details className="mt-3 rounded-champ border border-bordure p-4">
                <summary className="cursor-pointer select-none text-[13px] font-semibold text-violet">
                  Modifier ce slot
                </summary>
                <div className="mt-4">
                  <FormulaireSponsor
                    action={majSponsorFormulaire}
                    categories={categories}
                    sponsor={{
                      id: s.id,
                      titre: s.titre,
                      description: s.description,
                      url: s.url,
                      imageUrl: s.imageUrl,
                      emplacement: s.emplacement,
                      categorieId: s.categorieId,
                      debutLe: s.debutLe,
                      finLe: s.finLe,
                      note: s.note,
                    }}
                  />
                </div>
              </details>
            </Carte>
          );
        })}
        {sponsors.length === 0 && (
          <Carte className="p-6 text-[14px] text-encre">
            Aucun slot réservé pour l&apos;instant — crée le premier ci-dessus : il apparaîtra
            immédiatement sur le site (accueil ou catégorie choisie).
          </Carte>
        )}
      </div>
    </div>
  );
}
