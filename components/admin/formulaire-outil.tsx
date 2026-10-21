// components/admin/formulaire-article.tsx
"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Champ, Etiquette, ZoneTexte } from "@/components/ui/champ";
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

  const styleErreur = "mt-1 text-[13px] leading-4 text-red-600";
  const selectClasse =
    "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-violet focus:outline-none";

  return (
    <form action={actionFormulaire} noValidate className="grid gap-6">
      {article && <input type="hidden" name="articleId" value={article.id} />}

      {etat && !etat.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-carte border border-red-300 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {etat.message}
        </p>
      )}

      {/* ── Type et titre ────────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Type et titre</h3>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Etiquette htmlFor="type">Type *</Etiquette>
            <select id="type" name="type" defaultValue={article?.type ?? "BLOG"} className={selectClasse}>
              <option value="BLOG">Article de blog</option>
              <option value="ACTUALITE">Actualité</option>
            </select>
          </div>
          <div className="sm:col-span-2">
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
            />
            {etat?.erreurs?.titre && <p className={styleErreur}>{etat.erreurs.titre}</p>}
          </div>
        </div>

        <div>
          <Etiquette htmlFor="slug">Slug (adresse) *</Etiquette>
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
          <p className="mt-1 text-[12px] leading-4 text-encre">L'article sera visible sur : /articles/{slug || "…"}</p>
          {etat?.erreurs?.slug && <p className={styleErreur}>{etat.erreurs.slug}</p>}
        </div>

        <div>
          <Etiquette htmlFor="extrait">Résumé * (20 à 300 caractères — affiché dans les listes)</Etiquette>
          <ZoneTexte id="extrait" name="extrait" rows={2} defaultValue={article?.extrait} placeholder="Une ou deux phrases qui donnent envie de lire la suite." aria-invalid={Boolean(etat?.erreurs?.extrait)} />
          {etat?.erreurs?.extrait && <p className={styleErreur}>{etat.erreurs.extrait}</p>}
        </div>
      </Carte>

      {/* ── Image et auteur ──────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Image et auteur</h3>

        <div>
          <Etiquette htmlFor="image">URL de l'image (optionnel)</Etiquette>
          <Champ id="image" name="image" type="url" defaultValue={article?.image ?? ""} placeholder="https://… (image de couverture de l'article)" aria-invalid={Boolean(etat?.erreurs?.image)} />
          {etat?.erreurs?.image && <p className={styleErreur}>{etat.erreurs.image}</p>}
        </div>

        <div>
          <Etiquette htmlFor="auteur">Auteur (optionnel)</Etiquette>
          <Champ id="auteur" name="auteur" defaultValue={article?.auteur ?? ""} placeholder="L'équipe Webgiverse" aria-invalid={Boolean(etat?.erreurs?.auteur)} />
          {etat?.erreurs?.auteur && <p className={styleErreur}>{etat.erreurs.auteur}</p>}
        </div>
      </Carte>

      {/* ── Contenu ──────────────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Contenu de l'article *</h3>
        <p className="-mt-3 text-[13px] leading-5 text-encre">
          Écris ton texte ici. Chaque <strong>ligne vide</strong> crée un nouveau paragraphe sur le site.
          (50 caractères minimum)
        </p>
        <ZoneTexte
          id="contenu"
          name="contenu"
          rows={16}
          defaultValue={article?.contenu}
          placeholder={"Premier paragraphe de ton article…\n\nDeuxième paragraphe…"}
          aria-invalid={Boolean(etat?.erreurs?.contenu)}
          className="font-texte"
        />
        {etat?.erreurs?.contenu && <p className={styleErreur}>{etat.erreurs.contenu}</p>}
      </Carte>

      {/* ── Publication ──────────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Publication</h3>
        <div className="max-w-sm">
          <Etiquette htmlFor="statut">Statut *</Etiquette>
          <select id="statut" name="statut" defaultValue={article?.statut ?? "PUBLIE"} className={selectClasse}>
            <option value="PUBLIE">Publié (visible sur le site)</option>
            <option value="BROUILLON">Brouillon (invisible)</option>
          </select>
        </div>
      </Carte>

      {/* ── Boutons ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : article ? "Enregistrer les modifications" : "Créer l'article"}
        </Bouton>
        <Bouton asChild variante="secondaire">
          <Link href="/admin/articles">Annuler</Link>
        </Bouton>
      </div>
    </form>
  );
}