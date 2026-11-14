// components/admin/formulaire-article.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 88 — Formulaire d'article avec l'ASSISTANT IA DU BLOG complet.
//
//   • Résumé (extrait) : 1 clic « Proposer un résumé (IA) » (Lot 25,
//     réparé : la route /api/admin/ia existe enfin — Lot 88).
//   • NOUVEAU — Améliorer le contenu : l'IA réécrit et enrichit
//     l'article (intro accrocheuse, sous-titres, listes, transitions,
//     conclusion) avec le TON choisi (persuasif, professionnel,
//     engageant, simple). Le HTML renvoyé est assaini côté serveur
//     puis injecté dans l'éditeur (remontage par `key` React).
//   • NOUVEAU — Proposer 3 titres : suggestions cliquables, un clic
//     remplace le titre (et le slug s'il n'a pas été modifié à la main).
//   • NOUVEAU — Mots-clés SEO secondaires : générés en 1 clic,
//     enregistrés avec l'article (Article.motsCles, Lot 88) et
//     exposés en meta keywords sur la page publique.
//
// Lot 89 — IMAGE PRINCIPALE : les liens de partage Dropbox / Google
// Drive collés dans le champ sont convertis AU VOL en liens d'image
// directs (raw=1 / uc?export=view). Un lien de DOSSIER ou un document
// Google est signalé avec une explication claire. L'aperçu et le site
// public affichent enfin ces images.
//
// Sécurité front : chaque réponse est vérifiée AVANT JSON.parse —
// si le serveur renvoie autre chose que du JSON (page d'erreur HTML…),
// un message clair s'affiche au lieu du crash
// « Unexpected token '<', "<!DOCTYPE"… is not valid JSON ».
// ─────────────────────────────────────────────────────────────────
"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ImageOff, ImageIcon, Sparkles, Wand2 } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Champ, Etiquette, ZoneTexte } from "@/components/ui/champ";
import { EditeurRiche } from "@/components/admin/editeur-riche";
import { convertirEnUrlImageDirecte } from "@/lib/images"; // Lot 89 — Dropbox/Drive
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
  motsCles: string;
};

type ActionArticle = (etat: EtatArticle, donnees: FormData) => Promise<EtatArticle>;
type TacheIa = "extrait" | "titres" | "motsCles" | "ameliorer";

const TONS = [
  { valeur: "persuasif", libelle: "Persuasif (convaincre, vendre l'idée)" },
  { valeur: "professionnel", libelle: "Professionnel (expert, précis)" },
  { valeur: "engageant", libelle: "Engageant (chaleureux, vivant)" },
  { valeur: "simple", libelle: "Simple (débutant, sans jargon)" },
] as const;

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

  // ── Lot 89 — IMAGE PRINCIPALE ────────────────────────────────────
  // Les liens de partage Dropbox / Google Drive sont convertis au vol
  // en liens d'image directs (raw=1 pour Dropbox, uc?export=view pour
  // Drive) : sans ça, l'aperçu ET l'image du site public restent
  // vides — ces liens de partage renvoient une PAGE WEB, pas une
  // image. Un lien de DOSSIER ou un document Google est signalé avec
  // une explication claire au lieu d'une image cassée muette.
  const conversionInitiale = convertirEnUrlImageDirecte(article?.image ?? "");
  const [image, setImage] = useState(conversionInitiale.url ?? article?.image ?? "");
  const [imageCasse, setImageCasse] = useState(false);
  const [imageNote, setImageNote] = useState(
    conversionInitiale.url && conversionInitiale.url !== (article?.image ?? "") && !conversionInitiale.erreur
      ? (conversionInitiale.message ?? "Lien converti en lien d'image direct.")
      : "",
  );
  const [imageErreur, setImageErreur] = useState(conversionInitiale.erreur ?? "");

  /** Convertit le lien collé et met à jour champ + messages. */
  function changerImage(valeur: string) {
    const conversion = convertirEnUrlImageDirecte(valeur);
    // url non null → champ remplacé par le lien direct (affiché tel
    // quel pour que la correction soit visible) ; null (dossier, doc…)
    // → le texte collé reste dans le champ, l'explication s'affiche.
    setImage(conversion.url ?? valeur);
    setImageCasse(false);
    setImageErreur(conversion.erreur ?? "");
    setImageNote(
      conversion.url && conversion.url !== valeur && !conversion.erreur
        ? (conversion.message ?? "Lien converti en lien d'image direct.")
        : "",
    );
  }

  // ── Éditeur riche ────────────────────────────────────────────────
  // Lot 88 — `cleEditeur` force le remontage de l'éditeur avec le
  // nouveau contenu quand l'IA propose une version améliorée.
  const [cleEditeur, setCleEditeur] = useState(0);
  const [contenuInitial, setContenuInitial] = useState(article?.contenu ?? "");
  const [contenuHtml, setContenuHtml] = useState(article?.contenu ?? "");
  const [contenuTexte, setContenuTexte] = useState("");

  // ── Assistant IA ─────────────────────────────────────────────────
  const [extrait, setExtrait] = useState(article?.extrait ?? "");
  const [motsCles, setMotsCles] = useState(article?.motsCles ?? "");
  const [ton, setTon] = useState<(typeof TONS)[number]["valeur"]>("persuasif");
  const [tacheEnCours, setTacheEnCours] = useState<TacheIa | null>(null);
  const [iaErreur, setIaErreur] = useState(""); // carte Résumé
  const [iaErreurAssistant, setIaErreurAssistant] = useState(""); // carte Assistant IA
  const [iaErreurMotsCles, setIaErreurMotsCles] = useState(""); // carte Mots-clés
  const [titresProposes, setTitresProposes] = useState<string[]>([]);

  /**
   * Appelle /api/admin/ia et renvoie le résultat — en vérifiant
   * d'abord que la réponse est bien du JSON (le crash « <!DOCTYPE »
   * ne peut plus arriver : on affiche un message clair à la place).
   */
  async function appelerAssistantIa(corps: Record<string, unknown>): Promise<string> {
    const reponse = await fetch("/api/admin/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const type = reponse.headers.get("content-type") ?? "";
    if (!type.includes("application/json")) {
      throw new Error("L'assistant IA n'a pas répondu correctement (erreur serveur). Réessaie dans un instant.");
    }
    const donnees = (await reponse.json()) as { ok?: boolean; resultat?: string; erreur?: string };
    if (!reponse.ok || !donnees?.ok) {
      throw new Error(String(donnees?.erreur ?? "L'assistant IA n'a pas répondu."));
    }
    return String(donnees.resultat ?? "");
  }

  /** Résumé : 1 clic dans la carte « Résumé ». */
  async function proposerResumeIA() {
    if (tacheEnCours) return;
    setIaErreur("");
    setTacheEnCours("extrait");
    try {
      const resultat = await appelerAssistantIa({
        tache: "extrait",
        titre,
        texte: `${titre}\n\n${contenuTexte || extrait}`.trim().slice(0, 8000),
      });
      setExtrait(resultat);
    } catch (e) {
      setIaErreur(e instanceof Error ? e.message : "L'assistant IA n'a pas répondu.");
    } finally {
      setTacheEnCours(null);
    }
  }

  /** Titres : 3 suggestions cliquables dans la carte « Assistant IA ». */
  async function proposerTitresIA() {
    if (tacheEnCours) return;
    setIaErreurAssistant("");
    setTitresProposes([]);
    setTacheEnCours("titres");
    try {
      const resultat = await appelerAssistantIa({
        tache: "titres",
        titre,
        texte: contenuTexte.slice(0, 8000),
      });
      setTitresProposes(
        resultat
          .split("\n")
          .map((t) => t.replace(/^[-*•\d.)\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 3),
      );
    } catch (e) {
      setIaErreurAssistant(e instanceof Error ? e.message : "L'assistant IA n'a pas répondu.");
    } finally {
      setTacheEnCours(null);
    }
  }

  /** Un clic sur un titre proposé → remplace le titre (+ slug auto). */
  function choisirTitre(titreChoisi: string) {
    setTitre(titreChoisi);
    if (!slugModifie) setSlug(slugifierLocal(titreChoisi));
    setTitresProposes([]);
  }

  /** Contenu : l'IA réécrit et enrichit l'article avec le ton choisi. */
  async function ameliorerContenuIA() {
    if (tacheEnCours) return;
    setIaErreurAssistant("");
    setTacheEnCours("ameliorer");
    try {
      const html = await appelerAssistantIa({
        tache: "ameliorer",
        titre,
        contenu: contenuHtml,
        ton,
      });
      // Remontage de l'éditeur avec la version améliorée (assainie
      // côté serveur — même filtre que l'enregistrement).
      setContenuInitial(html);
      setContenuHtml(html);
      setContenuTexte(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
      setCleEditeur((k) => k + 1);
    } catch (e) {
      setIaErreurAssistant(e instanceof Error ? e.message : "L'assistant IA n'a pas répondu.");
    } finally {
      setTacheEnCours(null);
    }
  }

  /** Mots-clés SEO secondaires : 1 clic dans la carte dédiée. */
  async function proposerMotsClesIA() {
    if (tacheEnCours) return;
    setIaErreurMotsCles("");
    setTacheEnCours("motsCles");
    try {
      const resultat = await appelerAssistantIa({
        tache: "motsCles",
        titre,
        texte: contenuTexte.slice(0, 8000),
      });
      setMotsCles(resultat);
    } catch (e) {
      setIaErreurMotsCles(e instanceof Error ? e.message : "L'assistant IA n'a pas répondu.");
    } finally {
      setTacheEnCours(null);
    }
  }

  const matiereSuffisante = titre.trim().length >= 4 || contenuTexte.trim().length >= 20;

  return (
    <form action={actionFormulaire} noValidate className="grid gap-6 lg:grid-cols-3">
      {article && <input type="hidden" name="articleId" value={article.id} />}

      {/* ═══ Colonne principale : titre + description + assistant IA ═══ */}
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
          <EditeurRiche
            key={cleEditeur}
            valeurInitiale={contenuInitial}
            placeholder="Premier paragraphe de ton article…"
            onChange={(html, texte) => {
              setContenuHtml(html);
              setContenuTexte(texte);
            }}
          />
          {etat?.erreurs?.contenu && <p className={styleErreur}>{etat.erreurs.contenu}</p>}
        </Carte>

        {/* ── Assistant IA du blog (Lot 88) ──────────────────────────── */}
        <Carte className="grid gap-4 border-primaire/30 p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-primaire/10 text-primaire-texte">
              <Wand2 className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-titre text-[16px] leading-6 font-semibold">Assistant IA du blog</h3>
              <p className="mt-0.5 text-[13px] leading-5 text-encre">
                Fais enrichir et réécrire ton article (structure, transitions, conclusion),
                puis relis toujours avant d'enregistrer.
              </p>
            </div>
          </div>

          {iaErreurAssistant && (
            <p
              role="alert"
              className="rounded-champ border border-adm-erreur/40 bg-adm-erreur-doux px-3 py-2 text-[13px] font-semibold text-[#c94f35]"
            >
              {iaErreurAssistant}
            </p>
          )}

          <div>
            <Etiquette htmlFor="tonIa">Ton d'écriture souhaité</Etiquette>
            <select
              id="tonIa"
              value={ton}
              onChange={(e) => setTon(e.target.value as (typeof TONS)[number]["valeur"])}
              className={selectClasse}
            >
              {TONS.map((t) => (
                <option key={t.valeur} value={t.valeur}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <Bouton
              type="button"
              variante="indigo"
              onClick={ameliorerContenuIA}
              disabled={tacheEnCours !== null || contenuTexte.trim().length < 50}
              title="L'IA réécrit et enrichit le contenu de l'éditeur (le texte actuel sera remplacé)"
            >
              <Sparkles className="size-4" aria-hidden />
              {tacheEnCours === "ameliorer" ? "L'IA réécrit l'article…" : "Améliorer le contenu (IA)"}
            </Bouton>
            <Bouton
              type="button"
              variante="indigoDoux"
              onClick={proposerTitresIA}
              disabled={tacheEnCours !== null || !matiereSuffisante}
              title="L'IA propose 3 titres alternatifs — un clic pour en appliquer un"
            >
              <Sparkles className="size-4" aria-hidden />
              {tacheEnCours === "titres" ? "L'IA cherche des titres…" : "Proposer des titres (IA)"}
            </Bouton>
          </div>

          {tacheEnCours === "ameliorer" && (
            <p className="text-[13px] leading-5 text-encre">
              L'amélioration peut prendre 30 à 60 secondes (réécriture complète). Laisse cet onglet ouvert.
            </p>
          )}

          {titresProposes.length > 0 && (
            <div className="grid gap-2">
              <p className="text-[13px] font-semibold text-bleu">Clique sur un titre pour l'appliquer :</p>
              {titresProposes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => choisirTitre(t)}
                  className="rounded-champ border border-bordure bg-white px-3 py-2.5 text-left text-[14px] leading-5 text-bleu transition hover:border-primaire hover:bg-primaire/5"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
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
              onChange={(e) => changerImage(e.target.value)}
              placeholder="https://… (image de couverture, lien Dropbox/Drive accepté)"
              aria-invalid={Boolean(etat?.erreurs?.image) || Boolean(imageErreur)}
            />
            {imageErreur && (
              <p role="alert" className="mt-2 rounded-champ border border-adm-erreur/40 bg-adm-erreur-doux px-3 py-2 text-[13px] leading-5 text-[#c94f35]">
                {imageErreur}
              </p>
            )}
            {!imageErreur && imageNote && (
              <p className="mt-2 text-[12px] leading-4 text-encre">{imageNote}</p>
            )}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-titre text-[16px] leading-6 font-semibold">Résumé *</h3>
              <p className="mt-0.5 text-[12px] leading-4 text-encre">
                20 à 300 caractères — affiché dans les listes d'articles.
              </p>
            </div>
            <Bouton
              type="button"
              variante="indigoDoux"
              onClick={proposerResumeIA}
              disabled={tacheEnCours !== null || !matiereSuffisante}
              title="Générer un résumé avec l'IA à partir du titre et du contenu"
            >
              <Sparkles className="size-4" aria-hidden />
              {tacheEnCours === "extrait" ? "L'IA rédige…" : "Proposer un résumé (IA)"}
            </Bouton>
          </div>
          {iaErreur && (
            <p role="alert" className="rounded-champ border border-adm-erreur/40 bg-adm-erreur-doux px-3 py-2 text-[13px] font-semibold text-[#c94f35]">
              {iaErreur}
            </p>
          )}
          <ZoneTexte
            id="extrait"
            name="extrait"
            rows={3}
            value={extrait}
            onChange={(e) => setExtrait(e.target.value)}
            placeholder="Une ou deux phrases qui donnent envie de lire la suite — ou clique sur « Proposer un résumé (IA) »."
            aria-invalid={Boolean(etat?.erreurs?.extrait)}
          />
          {etat?.erreurs?.extrait && <p className={styleErreur}>{etat.erreurs.extrait}</p>}
        </Carte>

        {/* ── Mots-clés SEO (Lot 88) ───────────────────────────────── */}
        <Carte className="grid gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-titre text-[16px] leading-6 font-semibold">Mots-clés SEO</h3>
              <p className="mt-0.5 text-[12px] leading-4 text-encre">
                Optionnel — requêtes secondaires séparées par des virgules.
              </p>
            </div>
            <Bouton
              type="button"
              variante="indigoDoux"
              onClick={proposerMotsClesIA}
              disabled={tacheEnCours !== null || !matiereSuffisante}
              title="Générer 15 à 20 mots-clés SEO secondaires avec l'IA"
            >
              <Sparkles className="size-4" aria-hidden />
              {tacheEnCours === "motsCles" ? "L'IA analyse…" : "Générer (IA)"}
            </Bouton>
          </div>
          {iaErreurMotsCles && (
            <p role="alert" className="rounded-champ border border-adm-erreur/40 bg-adm-erreur-doux px-3 py-2 text-[13px] font-semibold text-[#c94f35]">
              {iaErreurMotsCles}
            </p>
          )}
          <ZoneTexte
            id="motsCles"
            name="motsCles"
            rows={3}
            value={motsCles}
            onChange={(e) => setMotsCles(e.target.value)}
            placeholder="ex : outil ia gratuit, alternative chatgpt, ia pour rédiger…"
            aria-invalid={Boolean(etat?.erreurs?.motsCles)}
          />
          {etat?.erreurs?.motsCles && <p className={styleErreur}>{etat.erreurs.motsCles}</p>}
          <p className="text-[12px] leading-4 text-encre">
            Enregistrés avec l'article et exposés aux moteurs de recherche (meta keywords).
          </p>
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