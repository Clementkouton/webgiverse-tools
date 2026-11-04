// components/admin/gestion-liste-admin.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 34 — Tableau de gestion réutilisable pour les listes admin
// (/admin/tutoriels, /admin/outils, /admin/prompts) :
//   • RECHERCHE PAR MOTS (filtre intelligent) : chaque mot de la
//     requête doit être présent, peu importe l'ordre ni la position —
//     « figma maquette » trouve « Tutoriel maquette et design Figma ».
//     Insensible à la casse et aux accents.
//   • FILTRES déroulants (niveau, statut, type, catégorie…).
//   • SÉLECTION par cases à cocher : tout/tout affiché, désélection,
//     raccourcis 40 / 150 / 200 premiers affichés — puis SUPPRESSION
//     EN MASSE confirmée (action serveur reçue en prop).
//   • Actions par ligne conservées : badge « Nouveau », publier/
//     archiver, mise en avant, modifier, supprimer.
// Toutes les données arrivent sérialisées (aucune requête BDD côté
// client) ; les actions serveur sont passées en props.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, Pencil, Search, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ElementListeAdmin = {
  id: string;
  titre: string;
  /** Lien public (fiche). */
  href?: string;
  /** Lien d'édition admin (outils). */
  hrefEdition?: string;
  /** Sous-titre grisé (slug, URL…). */
  sousTitre?: string;
  /** Emoji affiché devant le titre (prompts). */
  emoji?: string;
  /** URL de logo (outils) — sinon initiale sur pastille. */
  logo?: string | null;
  badges?: { label: string; classe: string }[];
  /** Colonnes texte supplémentaires (durée, vues…). */
  cellules?: string[];
  /** Texte brut passé au filtre par mots (titre + outils + catégorie…). */
  recherche: string;
  /** Valeurs pour les filtres déroulants (champ → valeur). */
  filtres?: Record<string, string>;
  /** Badge « Nouveau » (interrupteur si actionBasculerNouveau fournie). */
  nouveau?: boolean;
  /** Mise en avant (outils). */
  miseEnAvant?: boolean;
};

export type ResultatSuppressionMasse = { ok: boolean; message: string; supprimes: number };

type Props = {
  /** En-têtes des colonnes correspondant à `cellules`. */
  colonnes: string[];
  items: ElementListeAdmin[];
  /** Filtres déroulants : { champ, label } — valeurs déduites des items. */
  filtres?: { champ: string; label: string }[];
  /** Terme pour les messages : « tutoriel », « outil », « prompt »… */
  libelleTerme: string;
  actionSupprimerMasse: (ids: string[]) => Promise<ResultatSuppressionMasse>;
  /** Actions par ligne (Server Actions passées en props). */
  actionBasculerNouveau?: (donnees: FormData) => Promise<void>;
  actionBasculerStatut?: (donnees: FormData) => Promise<void>;
  actionBasculerMiseEnAvant?: (donnees: FormData) => Promise<void>;
  /** Nom du champ caché pour les actions FormData (« tutoId »…). */
  champId?: string;
  /** Valeur initiale de la recherche (?q= de la topbar admin). */
  rechercheInitiale?: string;
};

const PAS_AFFICHAGE = 300;

/** Minuscules + sans accents : base du filtre intelligent. */
function normaliser(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const CLASSE_BOUTON =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-adm-bordure bg-white px-3 text-[12.5px] leading-4 font-semibold text-adm-gris transition hover:border-primaire/40 hover:text-primaire-texte disabled:opacity-50";

export function GestionListeAdmin({
  colonnes,
  items,
  filtres = [],
  libelleTerme,
  actionSupprimerMasse,
  actionBasculerNouveau,
  actionBasculerStatut,
  actionBasculerMiseEnAvant,
  champId = "id",
  rechercheInitiale = "",
}: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [requete, setRequete] = useState(rechercheInitiale);
  const [valeursFiltres, setValeursFiltres] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [limite, setLimite] = useState(PAS_AFFICHAGE);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const refTout = useRef<HTMLInputElement | null>(null);

  // ── Filtre par mots : chaque mot doit exister, dans n'importe quel
  //    ordre, n'importe où (et non comme une suite exacte de mots).
  const mots = useMemo(
    () => normaliser(requete).split(/\s+/).filter(Boolean),
    [requete],
  );

  const filtres_ = useMemo(() => {
    const actifs = Object.entries(valeursFiltres).filter(([, v]) => v);
    return items.filter((item) => {
      if (actifs.some(([champ, valeur]) => (item.filtres?.[champ] ?? "") !== valeur)) return false;
      if (mots.length === 0) return true;
      const texte = normaliser(`${item.recherche} ${item.titre}`);
      return mots.every((mot) => texte.includes(mot));
    });
  }, [items, valeursFiltres, mots]);

  const visibles = filtres_.slice(0, limite);
  const pluriel = (n: number) => (n > 1 ? "s" : "");

  // État « tout sélectionné » pour la case d'en-tête.
  const tousAffichesCoches = visibles.length > 0 && visibles.every((i) => selection.has(i.id));
  useEffect(() => {
    if (refTout.current) refTout.current.indeterminate = !tousAffichesCoches && visibles.some((i) => selection.has(i.id));
  }, [tousAffichesCoches, visibles, selection]);

  function basculer(id: string) {
    setSelection((ancien) => {
      const suivant = new Set(ancien);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }
  function cocherAffiches() {
    setSelection(new Set(visibles.map((i) => i.id)));
  }
  function cocherNombre(n: number) {
    setSelection(new Set(visibles.slice(0, n).map((i) => i.id)));
  }

  function supprimerSelection() {
    const ids = [...selection];
    if (ids.length === 0) return;
    const accord = window.confirm(
      `Supprimer DÉFINITIVEMENT ${ids.length} ${libelleTerme}${pluriel(ids.length)} ? ` +
        "Les données liées (favoris, avis, progressions…) seront perdues. Cette action est irréversible.",
    );
    if (!accord) return;
    demarrer(async () => {
      try {
        const resultat = await actionSupprimerMasse(ids);
        setMessage({ ok: resultat.ok, texte: resultat.message });
        if (resultat.ok) setSelection(new Set());
        router.refresh();
      } catch {
        setMessage({ ok: false, texte: "La suppression a échoué. Réessaie ou recharge la page." });
      }
    });
  }

  function supprimerUn(id: string, titre: string) {
    if (!window.confirm(`Supprimer définitivement « ${titre} » ? Cette action est irréversible.`)) return;
    demarrer(async () => {
      try {
        const resultat = await actionSupprimerMasse([id]);
        setMessage({ ok: resultat.ok, texte: resultat.message });
        setSelection((ancien) => {
          const suivant = new Set(ancien);
          suivant.delete(id);
          return suivant;
        });
        router.refresh();
      } catch {
        setMessage({ ok: false, texte: "La suppression a échoué. Réessaie ou recharge la page." });
      }
    });
  }

  const filtresActifs = Object.values(valeursFiltres).some(Boolean) || mots.length > 0;

  return (
    <div>
      {/* ── Barre de recherche + filtres ─────────────────────────── */}
      <div className="mt-4 rounded-carte border border-bordure bg-white p-4 shadow-carte">
        <label className="block">
          <span className="text-[12px] font-bold uppercase tracking-wider text-encre">
            Rechercher un {libelleTerme}
          </span>
          <span className="relative mt-2 block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-encre/50" aria-hidden />
            <input
              type="search"
              value={requete}
              onChange={(e) => {
                setRequete(e.target.value);
                setLimite(PAS_AFFICHAGE);
              }}
              placeholder="Un ou plusieurs mots, dans n'importe quel ordre — ex. : figma maquette"
              className="w-full rounded-champ border border-bordure bg-gris/40 py-2.5 pl-10 pr-10 text-[14px] text-bleu outline-none transition placeholder:text-encre/40 focus:border-primaire/60 focus:bg-white"
            />
            {requete && (
              <button
                type="button"
                onClick={() => setRequete("")}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-encre/50 transition hover:bg-gris hover:text-encre"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </span>
        </label>
        <p className="mt-2 text-[12px] leading-4 text-encre">
          Filtre par <strong>mots indépendants</strong> : tous les mots doivent être présents, peu importe leur ordre
          (accents et majuscules ignorés).
        </p>

        {filtres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {filtres.map((f) => {
              const valeurs = [...new Set(items.map((i) => i.filtres?.[f.champ] ?? "").filter(Boolean))].sort((a, b) =>
                a.localeCompare(b, "fr"),
              );
              if (valeurs.length === 0) return null;
              return (
                <label key={f.champ} className="flex items-center gap-2 text-[13px] font-semibold text-encre">
                  {f.label}
                  <select
                    value={valeursFiltres[f.champ] ?? ""}
                    onChange={(e) => {
                      setValeursFiltres((ancien) => ({ ...ancien, [f.champ]: e.target.value }));
                      setLimite(PAS_AFFICHAGE);
                    }}
                    className="min-h-9 rounded-champ border border-bordure bg-gris/40 px-2.5 py-1.5 text-[13px] text-bleu outline-none focus:border-primaire/60"
                  >
                    <option value="">Tous</option>
                    {valeurs.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Barre de sélection / suppression en masse ────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-carte border border-bordure bg-white p-3 shadow-carte">
        <span className="mr-1 text-[13px] font-semibold text-encre">Sélection rapide :</span>
        {[40, 150, 200].map((n) => (
          <button key={n} type="button" className={CLASSE_BOUTON} disabled={enCours || visibles.length === 0} onClick={() => cocherNombre(n)}>
            {n} premiers
          </button>
        ))}
        <button type="button" className={CLASSE_BOUTON} disabled={enCours || visibles.length === 0} onClick={cocherAffiches}>
          Tout ce qui est affiché
        </button>
        <button
          type="button"
          className={CLASSE_BOUTON}
          disabled={enCours || selection.size === 0}
          onClick={() => setSelection(new Set())}
        >
          Désélectionner
        </button>
        <span className="mx-1 hidden h-6 w-px bg-bordure sm:block" aria-hidden />
        <button
          type="button"
          onClick={supprimerSelection}
          disabled={enCours || selection.size === 0}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-red-300 bg-white px-4 text-[13px] leading-4 font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
        >
          {enCours ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
          Supprimer la sélection ({selection.size})
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-carte border px-4 py-3 text-[14px] font-semibold",
            message.ok
              ? "border-adm-succes/40 bg-adm-succes-doux text-[#0b8a78]"
              : "border-adm-erreur/40 bg-adm-erreur-doux text-[#c94f35]",
          )}
        >
          {message.texte}
        </p>
      )}

      {/* ── Récapitulatif ────────────────────────────────────────── */}
      <p className="mt-4 text-[13px] leading-5 text-encre">
        {filtres_.length === items.length
          ? `${items.length} ${libelleTerme}${pluriel(items.length)} au total`
          : `${filtres_.length} ${libelleTerme}${pluriel(filtres_.length)} sur ${items.length} correspondent`}
        {filtresActifs && (
          <>
            {" — "}
            <button
              type="button"
              className="font-semibold text-primaire-texte underline underline-offset-2"
              onClick={() => {
                setRequete("");
                setValeursFiltres({});
              }}
            >
              réinitialiser les filtres
            </button>
          </>
        )}
      </p>

      {/* ── Tableau ──────────────────────────────────────────────── */}
      <div className="mt-2 overflow-x-auto rounded-carte border border-bordure bg-white p-2 shadow-carte">
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  ref={refTout}
                  type="checkbox"
                  checked={tousAffichesCoches}
                  onChange={() => (tousAffichesCoches ? setSelection(new Set()) : cocherAffiches())}
                  aria-label="Tout sélectionner (éléments affichés)"
                  className="size-4 accent-[#5d87ff]"
                />
              </th>
              <th className="px-3 py-3">{libelleTerme.charAt(0).toUpperCase() + libelleTerme.slice(1)}</th>
              {colonnes.map((c) => (
                <th key={c} className="px-3 py-3">
                  {c}
                </th>
              ))}
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "border-t border-bordure transition hover:bg-adm-fond/70",
                  selection.has(item.id) && "bg-primaire/5",
                )}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selection.has(item.id)}
                    onChange={() => basculer(item.id)}
                    aria-label={`Sélectionner : ${item.titre}`}
                    className="size-4 accent-[#5d87ff]"
                  />
                </td>
                <td className="max-w-96 px-3 py-3.5">
                  <div className="flex items-center gap-2.5">
                    {item.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logo} alt="" className="size-8 shrink-0 rounded-lg bg-white object-contain" />
                    ) : item.emoji ? (
                      <span aria-hidden className="shrink-0 text-[16px]">
                        {item.emoji}
                      </span>
                    ) : null}
                    <span className="min-w-0">
                      {item.href ? (
                        <Link href={item.href} target="_blank" className="block truncate font-semibold text-adm-sombre hover:text-primaire-texte">
                          {item.titre}
                        </Link>
                      ) : (
                        <span className="block truncate font-semibold text-adm-sombre">{item.titre}</span>
                      )}
                      {item.sousTitre && <span className="block truncate text-[12px] leading-4 text-encre">{item.sousTitre}</span>}
                    </span>
                  </div>
                  {item.badges && item.badges.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.badges.map((b) => (
                        <span key={b.label} className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] leading-4 font-semibold", b.classe)}>
                          {b.label}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                {colonnes.map((_, idx) => (
                  <td key={idx} className="px-3 py-3.5 text-encre tabular-nums">
                    {item.cellules?.[idx] ?? "—"}
                  </td>
                ))}
                <td className="px-3 py-3.5">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {actionBasculerNouveau && item.nouveau !== undefined && (
                      <form action={actionBasculerNouveau}>
                        <input type="hidden" name={champId} value={item.id} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={item.nouveau}
                          aria-label={`Badge nouveau : ${item.titre}`}
                          className={cn(
                            "relative h-6 w-10 shrink-0 rounded-full transition",
                            item.nouveau ? "bg-primaire" : "bg-adm-bordure",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                              item.nouveau ? "left-[18px]" : "left-0.5",
                            )}
                          />
                        </button>
                      </form>
                    )}
                    {actionBasculerStatut && (
                      <form action={actionBasculerStatut}>
                        <input type="hidden" name={champId} value={item.id} />
                        <button type="submit" className={CLASSE_BOUTON}>
                          {(item.filtres?.statut ?? "PUBLIE") === "PUBLIE" ? "Archiver" : "Publier"}
                        </button>
                      </form>
                    )}
                    {actionBasculerMiseEnAvant && (
                      <form action={actionBasculerMiseEnAvant}>
                        <input type="hidden" name={champId} value={item.id} />
                        <button type="submit" className={CLASSE_BOUTON} aria-pressed={item.miseEnAvant}>
                          <Star className={cn("size-3.5", item.miseEnAvant && "fill-amber-400 text-amber-400")} aria-hidden />
                          {item.miseEnAvant ? "À la une" : "Mettre en avant"}
                        </button>
                      </form>
                    )}
                    {item.hrefEdition && (
                      <Link href={item.hrefEdition} className={CLASSE_BOUTON}>
                        <Pencil className="size-3.5" aria-hidden /> Modifier
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => supprimerUn(item.id, item.titre)}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-300 bg-white px-3 text-[12.5px] leading-4 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-encre">
            Aucun {libelleTerme} pour l&apos;instant.
          </p>
        )}
        {items.length > 0 && filtres_.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-encre">
            Aucun résultat pour cette recherche ou ces filtres.
          </p>
        )}
      </div>

      {filtres_.length > visibles.length && (
        <div className="mt-4 text-center">
          <button type="button" className={CLASSE_BOUTON} onClick={() => setLimite((l) => l + PAS_AFFICHAGE)}>
            Afficher plus ({filtres_.length - visibles.length} restants)
          </button>
        </div>
      )}
    </div>
  );
}
