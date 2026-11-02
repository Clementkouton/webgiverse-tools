// components/admin/import-csv.tsx
"use client";
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Formulaire d'import CSV réutilisable (outils / tutoriels /
// prompts). Deux sources possibles : un fichier .csv OU un collage
// direct du texte. Option « mettre à jour les éléments existants
// (même slug) ». Le rapport affiche créés / mis à jour / ignorés et
// les erreurs ligne par ligne.
// ─────────────────────────────────────────────────────────────────
import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Etiquette, ZoneTexte } from "@/components/ui/champ";
import type { EtatImport } from "@/app/actions/import-csv";

type ActionImport = (etat: EtatImport, donnees: FormData) => Promise<EtatImport>;

/** Petite pastille de compteur du rapport. */
function Compteur({ valeur, libelle, classe }: { valeur: number; libelle: string; classe: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] leading-4 font-bold ${classe}`}>
      {valeur} {libelle}
    </span>
  );
}

export function ImportCsv({
  action,
  libelleBouton,
  cible,
}: {
  action: ActionImport;
  libelleBouton: string;
  /** Ce qu'on importe, pour les messages (« outils », « tutoriels »…). */
  cible: string;
}) {
  const [etat, actionFormulaire, enCours] = useActionState(action, null);

  return (
    <form action={actionFormulaire} className="grid gap-5 p-6">
      <div>
        <h3 className="font-titre text-[16px] leading-6 font-semibold">Fichier CSV</h3>
        <p className="mt-1 text-[13px] leading-5 text-encre">
          Choisis un fichier ou colle directement le contenu. Séparateur « ; » ou « , »
          détecté automatiquement — 500 lignes et 2 Mo maximum par import.
        </p>
      </div>

      {/* ── Choix du fichier ─────────────────────────────────────────── */}
      <label className="flex cursor-pointer items-center gap-3 rounded-carte border border-dashed border-adm-bordure bg-adm-fond/60 px-4 py-4 transition hover:border-primaire/60 hover:bg-primaire/5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primaire/10 text-primaire-texte">
          <FileSpreadsheet className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-5 font-semibold text-adm-sombre">
            Clique pour choisir un fichier .csv
          </span>
          <span className="block truncate text-[12px] leading-4 text-adm-gris">
            Excel, Google Sheets (export CSV), Numbers…
          </span>
        </span>
        <input type="file" name="fichier" accept=".csv,.txt,text/csv,text/plain" className="shrink-0 text-[13px] text-adm-gris file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primaire file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-white" />
      </label>

      {/* ── Ou collage direct ────────────────────────────────────────── */}
      <div>
        <Etiquette htmlFor="csvTexte">…ou colle ton CSV ici (optionnel)</Etiquette>
        <ZoneTexte
          id="csvTexte"
          name="csvTexte"
          rows={5}
          placeholder={"nom;url;description\nMon outil;https://exemple.com;Un outil génial pour…"}
          className="font-monospace text-[13px]"
        />
      </div>

      {/* ── Option de mise à jour ────────────────────────────────────── */}
      <label className="flex cursor-pointer items-start gap-3 rounded-carte border border-bordure bg-white px-4 py-3">
        <input
          type="checkbox"
          name="maj"
          className="mt-0.5 size-4 shrink-0 accent-[#5d87ff]"
        />
        <span className="text-[13px] leading-5 text-encre">
          <strong className="font-semibold text-adm-sombre">Mettre à jour les {cible} existants</strong>{" "}
          (même slug) au lieu de les ignorer. Chaque colonne présente dans le CSV écrase
          l'ancienne valeur ; les colonnes absentes du fichier conservent l'ancienne valeur.
        </span>
      </label>

      {/* ── Erreur globale ───────────────────────────────────────────── */}
      {etat && !etat.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-carte border border-adm-erreur/40 bg-adm-erreur-doux px-4 py-3 text-[14px] font-semibold text-[#c94f35]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {etat.message}
        </p>
      )}

      {/* ── Rapport du dernier import ────────────────────────────────── */}
      {etat && etat.ok && (
        <div className="grid gap-3 rounded-carte border border-adm-succes/40 bg-adm-succes-doux px-4 py-4">
          <p className="flex items-start gap-2 text-[14px] leading-5 font-bold text-[#0b8a78]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            {etat.message}
          </p>
          <div className="flex flex-wrap gap-2">
            {typeof etat.crees === "number" && <Compteur valeur={etat.crees} libelle="créé(s)" classe="bg-adm-succes-doux text-[#0f9b85]" />}
            {typeof etat.majes === "number" && <Compteur valeur={etat.majes} libelle="mis à jour" classe="bg-adm-info-doux text-[#2b6be0]" />}
            {typeof etat.ignores === "number" && etat.ignores > 0 && <Compteur valeur={etat.ignores} libelle="ignoré(s)" classe="bg-gris text-encre" />}
            {typeof etat.categoriesCreees === "number" && etat.categoriesCreees > 0 && (
              <Compteur valeur={etat.categoriesCreees} libelle="catégorie(s) créée(s)" classe="bg-adm-alerte-doux text-[#b26f00]" />
            )}
          </div>
          {etat.erreurs && etat.erreurs.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-[#c94f35]">
                {etat.erreurs.length} ligne(s) rejetée(s) :
              </p>
              <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-champ border border-adm-erreur/30 bg-white px-3 py-2 text-[12px] leading-5 text-[#c94f35]">
                {etat.erreurs.map((erreur, i) => (
                  <li key={i} className="border-b border-bordure/60 py-1 last:border-0">
                    {erreur}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Bouton ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Bouton type="submit" variante="indigo" disabled={enCours}>
          {enCours ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Import en cours…
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden /> {libelleBouton}
            </>
          )}
        </Bouton>
        <span className="text-[12px] leading-4 text-adm-gris">
          Une ligne invalide ne bloque jamais les autres : elles sont listées dans le rapport.
        </span>
      </div>
    </form>
  );
}