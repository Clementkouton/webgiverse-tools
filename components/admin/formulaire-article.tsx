// components/admin/formulaire-article.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Formulaire d'article refait d'après la maquette fournie :
//   • colonne principale : TITRE en grand, puis DESCRIPTION * avec
//     l'éditeur riche (barre d'outils gras/italique/alignements/
//     liens/images/tableaux), puis bouton « Enregistrer » aligné à
//     droite (comme la maquette) ;
//   • colonne latérale : IMAGE PRINCIPALE (URL + aperçu live),
//     Publication (type, statut, auteur), Résumé, Adresse (slug).
// Compatible avec les anciens articles « texte brut » : au montage
// l'éditeur les convertit en paragraphes (lib/html.ts).
// ─────────────────────────────────────────────────────────────────
"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ImageOff, ImageIcon } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Champ, Etiquette, ZoneTexte } from "@/components/ui/champ";
import { EditeurRiche } from "@/components/admin/editeur-riche";
import type { EtatArticle } from "@/app/actions/admin";

export type ArticleForme = {
  id: string;
  titre: string;
  slug: string;
  type: "ACTUALITE" | "BLOG";
  statut: "BROUILLON" | "PUBLIE";
  extrait: string;
  image: string | null;
  auteur: string;
  contenu: string;
};

type ActionArticle = (etat: EtatArticle, donnees: FormData) => Promise<EtatArticle>;

/** Même logique que slugifier() côté serveur (lib/utils). */
function slugifierLocal(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const styleErreur = "mt-1 text-[13px] leading-4 text-red-600";
const selectClasse =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-primaire focus:outline-none";

export function FormulaireArticle({
  action,
  article,
}: {
  action: ActionArticle;
  article?: ArticleForme;
}) {
  const [etat, actionFormulaire, enCours] = useActionState(action, null);

  const [titre, setTitre] = useState(article?.titre ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugModifie, setSlugModifie] = useState(Boolean(article));
  const [image, setImage] = useState(article?.image ?? "");
  const [imageCasse, setImageCasse] = useState(false);

  return (
    <form action={actionFormulaire} noValidate className="grid gap-6 lg:grid-cols-3">
      {article && <input type="hidden" name="articleId" value={article.id} />}

      {/* ═══ Colonne principale : titre + description (éditeur riche) ═══ */}
      <div className="grid content-start gap-6 lg:col-span-2">
        {etat && !etat.ok && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-carte border border-adm-erreur/40 bg-adm-erreur-doux px-4 py-3 text-[14px] font-semibold text-[#c94f35]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {etat.message}
          </p>
        )}

        {/* ── Titre ──────────────────────────────────────────────────── */}
        <Carte className="grid gap-4 p-6">
          <div>
            <Etiquette htmlFor="titre">Titre *</Etiquette>
            <Champ
              id="titre"
              name="titre"
              value={titre}
              onChange={(e) => {
                setTitre(e.target.value);
                if (!slugModifie) setSlug(slugifierLocal(e.target.value));
              }}
              placeholder="Ex : Les 10 meilleurs assistants IA en 2026"
              aria-invalid={Boolean(etat?.erreurs?.titre)}
              className="h-12 text-[16px] font-semibold"
            />
            {etat?.erreurs?.titre && <p className={styleErreur}>{etat.erreurs.titre}</p>}
          </div>
        </Carte>

        {/* ── Description (éditeur riche, comme la maquette) ─────────── */}
        <Carte className="grid gap-4 p-6">
          <div>
            <Etiquette htmlFor="contenu">Description *</Etiquette>
            <p className="mt-1 text-[13px] leading-5 text-encre">
              Mets ton texte en forme : il sera affiché à l'identique sur le site. 50 caractères minimum.
            </p>
          </div>
          <EditeurRiche valeurInitiale={article?.contenu ?? ""} placeholder="Premier paragraphe de ton article…" />
          {etat?.erreurs?.contenu && <p className={styleErreur}>{etat.erreurs.contenu}</p>}
        </Carte>

        {/* ── Enregistrer (en bas à droite, comme la maquette) ───────── */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Bouton asChild variante="secondaire">
            <Link href="/admin/articles">Annuler</Link>
          </Bouton>
          <Bouton type="submit" variante="indigo" disabled={enCours}>
            <CheckCircle2 className="size-4" aria-hidden />
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
        </div>
      </div>

      {/* ═══ Colonne latérale ══════════════════════════════════════════ */}
      <div className="grid content-start gap-6">
        {/* ── Image principale ─────────────────────────────────────── */}
        <Carte className="grid gap-3 p-6">
          <h3 className="font-titre text-[16px] leading-6 font-semibold">Image principale</h3>

          {/* Aperçu live */}
          {image.trim() && !imageCasse ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt="Aperçu de l'image principale"
              onError={() => setImageCasse(true)}
              className="aspect-video w-full rounded-champ border border-bordure object-cover"
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-champ border border-dashed border-adm-bordure bg-adm-fond/60 text-adm-gris-clair">
              {imageCasse ? (
                <span className="flex items-center gap-1.5 text-[13px] text-[#c94f35]">
                  <ImageOff className="size-4" aria-hidden /> Image introuvable à cette adresse
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[13px]">
                  <ImageIcon className="size-4" aria-hidden /> Aperçu de l'image principale
                </span>
              )}
            </div>
          )}

          <div>
            <Etiquette htmlFor="image">URL de l'image (optionnel)</Etiquette>
            <Champ
              id="image"
              name="image"
              type="url"
              value={image}
              onChange={(e) => {
                setImage(e.target.value);
                setImageCasse(false);
              }}
              placeholder="https://… (image de couverture)"
              aria-invalid={Boolean(etat?.erreurs?.image)}
            />
            {etat?.erreurs?.image && <p className={styleErreur}>{etat.erreurs.image}</p>}
          </div>
        </Carte>

        {/* ── Publication ──────────────────────────────────────────── */}
        <Carte className="grid gap-4 p-6">
          <h3 className="font-titre text-[16px] leading-6 font-semibold">Publication</h3>
          <div>
            <Etiquette htmlFor="type">Type *</Etiquette>
            <select id="type" name="type" defaultValue={article?.type ?? "BLOG"} className={selectClasse}>
              <option value="BLOG">Article de blog</option>
              <option value="ACTUALITE">Actualité</option>
            </select>
          </div>
          <div>
            <Etiquette htmlFor="statut">Statut *</Etiquette>
            <select id="statut" name="statut" defaultValue={article?.statut ?? "PUBLIE"} className={selectClasse}>
              <option value="PUBLIE">Publié (visible sur le site)</option>
              <option value="BROUILLON">Brouillon (invisible)</option>
            </select>
          </div>
          <div>
            <Etiquette htmlFor="auteur">Auteur (optionnel)</Etiquette>
            <Champ id="auteur" name="auteur" defaultValue={article?.auteur ?? ""} placeholder="L'équipe Webgiverse" aria-invalid={Boolean(etat?.erreurs?.auteur)} />
            {etat?.erreurs?.auteur && <p className={styleErreur}>{etat.erreurs.auteur}</p>}
          </div>
        </Carte>

        {/* ── Résumé ───────────────────────────────────────────────── */}
        <Carte className="grid gap-3 p-6">
          <h3 className="font-titre text-[16px] leading-6 font-semibold">Résumé *</h3>
          <p className="-mt-2 text-[12px] leading-4 text-encre">
            20 à 300 caractères — affiché dans les listes d'articles.
          </p>
          <ZoneTexte
            id="extrait"
            name="extrait"
            rows={3}
            defaultValue={article?.extrait}
            placeholder="Une ou deux phrases qui donnent envie de lire la suite."
            aria-invalid={Boolean(etat?.erreurs?.extrait)}
          />
          {etat?.erreurs?.extrait && <p className={styleErreur}>{etat.erreurs.extrait}</p>}
        </Carte>

        {/* ── Adresse (slug) ───────────────────────────────────────── */}
        <Carte className="grid gap-3 p-6">
          <h3 className="font-titre text-[16px] leading-6 font-semibold">Adresse (slug) *</h3>
          <div>
            <Etiquette htmlFor="slug">Slug</Etiquette>
            <Champ
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugModifie(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="ex : meilleurs-assistants-ia-2026"
              aria-invalid={Boolean(etat?.erreurs?.slug)}
            />
          </div>
          <p className="-mt-1 text-[12px] leading-4 text-encre">
            L'article sera visible sur : <span className="font-semibold text-primaire-texte">/articles/{slug || "…"}</span>
          </p>
          {etat?.erreurs?.slug && <p className={styleErreur}>{etat.erreurs.slug}</p>}
        </Carte>
      </div>
    </form>
  );
}