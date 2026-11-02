// app/admin/import/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 23b — IMPORT EN MASSE depuis la console admin : au lieu de
// créer les outils / tutoriels / prompts UN PAR UN, tu déposes un
// fichier CSV (des centaines de lignes d'un coup).
// Lot 23b : mise en page REFONDUE — tout est empilé en pleine largeur.
// L'ancienne grille 3/5 + 2/5 écrasait la carte de gauche (~500 px) :
// textes coupés, champ fichier débordant, tableau squeezed avec double
// scrollbar. En une colonne, chaque bloc respire, quelle que soit la
// taille d'écran (et plus aucune coupure de texte).
// Lot 23c — correctif MOBILE : sur téléphone toute la page était
// décalée/coupée à droite (textes tronqués, boutons hors écran).
// Cause : un enfant au contenu « nowrap » regonflait le pigeon de
// grille au-delà de l'écran. Correctif : [&>*]:min-w-0 sur la grille
// — chaque carte peut rétrécir et gère son propre débordement interne
// (le tableau des colonnes défile horizontalement DANS sa carte).
//   • 3 onglets : Outils / Tutoriels / Prompts (chips, ?onglet=…) ;
//   • modèle CSV téléchargeable pour chaque type (public/imports/) ;
//   • tableau des colonnes attendues (requis ou optionnel), fluide ;
//   • formulaire d'import (fichier ou collage) + rapport détaillé.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, Info, TerminalSquare, MonitorPlay, Wrench } from "lucide-react";
import { Carte } from "@/components/ui/carte";
import { cn } from "@/lib/utils";
import { ImportCsv } from "@/components/admin/import-csv";
import {
  importerOutilsAction,
  importerPromptsAction,
  importerTutorielsAction,
} from "@/app/actions/import-csv";

export const metadata: Metadata = { title: "Import CSV — Administration" };
export const dynamic = "force-dynamic";

type Colonne = { nom: string; requis?: boolean; note: string; exemple: string };

type ConfigOnglet = {
  cle: string;
  libelle: string;
  icone: typeof Wrench;
  titre: string;
  description: string;
  modele: string;
  cible: string;
  colonnes: Colonne[];
};

const COLONNES_OUTILS: Colonne[] = [
  { nom: "nom", requis: true, note: "Nom affiché (2 à 80 caractères).", exemple: "ChatGPT" },
  { nom: "url", requis: true, note: "Adresse officielle de l'outil.", exemple: "https://chat.openai.com" },
  { nom: "description", requis: true, note: "30 à 600 caractères.", exemple: "Assistant conversationnel d'OpenAI…" },
  { nom: "type", note: "OUTIL ou AGENT (défaut : OUTIL).", exemple: "OUTIL" },
  { nom: "tarif", note: "Affichage libre (défaut : « À vérifier »).", exemple: "Freemium — Plus à 20 $/mois" },
  { nom: "tarifmin", note: "Prix mensuel indicatif en $ (vide = inconnu).", exemple: "20" },
  { nom: "gratuit", note: "1 = oui, 0 = non (ou oui/non, true/false).", exemple: "1" },
  { nom: "opensource", note: "1 ou 0.", exemple: "0" },
  { nom: "niveau", note: "Débutant / Intermédiaire / Avancé.", exemple: "Débutant" },
  { nom: "langues", note: "Plusieurs valeurs séparées par « | ».", exemple: "Français|Anglais" },
  { nom: "objectifs", note: "Séparées par « | » (20 max).", exemple: "Rédiger plus vite|Coder" },
  { nom: "fonctions", note: "Séparées par « | ».", exemple: "Rédaction|Analyse de fichiers" },
  { nom: "casusage", note: "Séparées par « | ».", exemple: "Support client|Blog" },
  { nom: "categories", note: "Slugs ou noms de catégories, « | » entre eux. Inconnue = ignorée.", exemple: "productivite|writing" },
  { nom: "logo", note: "URL d'un logo (sinon favicon auto).", exemple: "https://…/logo.png" },
  { nom: "statut", note: "PUBLIE / BROUILLON / ARCHIVE (défaut : PUBLIE).", exemple: "PUBLIE" },
  { nom: "misenavant", note: "1 = mis en avant sur l'accueil.", exemple: "0" },
  { nom: "slug", note: "Adresse /outil/… (sinon généré du nom).", exemple: "chatgpt" },
];

const COLONNES_TUTORIELS: Colonne[] = [
  { nom: "titre", requis: true, note: "Titre du tutoriel.", exemple: "Maîtriser ChatGPT en 30 minutes" },
  { nom: "youtubeid", note: "Identifiant YouTube (le code après watch?v=).", exemple: "aBcD123xYz4" },
  { nom: "dureemin", note: "Durée en minutes (défaut : 10).", exemple: "30" },
  { nom: "niveau", note: "DEBUTANT / INTERMEDIAIRE / AVANCE (ou en français).", exemple: "DEBUTANT" },
  { nom: "outils", note: "Outils ou thèmes concernés, « | » entre eux.", exemple: "ChatGPT|Prompt" },
  { nom: "ordre", note: "Rang de pertinence (1 = le plus pertinent).", exemple: "1" },
  { nom: "nouveau", note: "1 = badge « Nouveau » affiché.", exemple: "1" },
  { nom: "vues", note: "Compteur de vues initial.", exemple: "1250" },
  { nom: "miniature", note: "URL d'une miniature perso (sinon miniature YouTube).", exemple: "https://…/mini.jpg" },
  { nom: "slug", note: "Adresse /tutoriels/… (sinon généré du titre).", exemple: "maitriser-chatgpt" },
];

const COLONNES_PROMPTS: Colonne[] = [
  { nom: "titre", requis: true, note: "Titre du prompt.", exemple: "Expert marketing" },
  { nom: "contenu", requis: true, note: "Le prompt complet. Plusieurs lignes = mets-le entre guillemets.", exemple: "\"Agis comme un expert en marketing…\"" },
  { nom: "description", note: "Aperçu public 1–2 phrases (sinon déduite du contenu).", exemple: "Un plan marketing 30 jours clé en main." },
  { nom: "categorie", requis: true, note: "Slug OU nom de catégorie — créée automatiquement si inconnue.", exemple: "marketing" },
  { nom: "type", note: "TEXTE / IMAGE / CODE (défaut : TEXTE).", exemple: "TEXTE" },
  { nom: "modeles", note: "Modèles compatibles, « | » entre eux.", exemple: "ChatGPT|Claude" },
  { nom: "souscategorie", note: "Tag français (ex. Réseaux sociaux).", exemple: "Réseaux sociaux" },
  { nom: "roles", note: "Slugs de rôles, « | » entre eux.", exemple: "entrepreneurs|marketeurs" },
  { nom: "conseils", note: "Conseils d'utilisation.", exemple: "Précise ton secteur." },
  { nom: "utilisation", note: "Variables à remplir avant d'envoyer.", exemple: "Remplace [PRODUIT]…" },
  { nom: "emoji", note: "Emoji d'illustration (défaut : ✨).", exemple: "🚀" },
  { nom: "ordre", note: "Rang de pertinence (1 = le plus pertinent).", exemple: "1" },
  { nom: "nouveau", note: "1 = badge « Nouveau ».", exemple: "0" },
  { nom: "vues", note: "Compteur de vues initial.", exemple: "420" },
  { nom: "slug", note: "Adresse /prompts/… (sinon généré du titre).", exemple: "expert-marketing" },
];

const ONGLETS: ConfigOnglet[] = [
  {
    cle: "outils",
    libelle: "Outils",
    icone: Wrench,
    titre: "Importer des outils",
    description:
      "Des centaines d'outils en un seul fichier : chaque LIGNE devient une fiche outil publiée dans l'annuaire.",
    modele: "/imports/modele-outils.csv",
    cible: "outils",
    colonnes: COLONNES_OUTILS,
  },
  {
    cle: "tutoriels",
    libelle: "Tutoriels",
    icone: MonitorPlay,
    titre: "Importer des tutoriels",
    description:
      "Alimente la collection vidéo d'un coup : chaque LIGNE devient un tutoriel de la section Apprendre.",
    modele: "/imports/modele-tutoriels.csv",
    cible: "tutoriels",
    colonnes: COLONNES_TUTORIELS,
  },
  {
    cle: "prompts",
    libelle: "Prompts",
    icone: TerminalSquare,
    titre: "Importer des prompts",
    description:
      "Remplis la bibliothèque en masse : chaque LIGNE devient un prompt métier (contenu réservé aux Premium).",
    modele: "/imports/modele-prompts.csv",
    cible: "prompts",
    colonnes: COLONNES_PROMPTS,
  },
];

export default async function PageImportAdmin({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  const actif = ONGLETS.find((o) => o.cle === onglet) ?? ONGLETS[0]!;

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Import CSV</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Arrête de créer les fiches une par une : prépare un fichier CSV (Excel, Google Sheets…)
          et importe des centaines de lignes d'un coup.
        </p>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────────── */}
      <div className="animate-apparition-haut delai-1 mt-5 flex flex-wrap items-center gap-2">
        {ONGLETS.map((o) => {
          const est = o.cle === actif.cle;
          return (
            <Link
              key={o.cle}
              href={`/admin/import?onglet=${o.cle}`}
              aria-current={est ? "true" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] leading-4 font-semibold transition",
                est
                  ? "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                  : "border border-adm-bordure bg-white text-adm-gris hover:border-primaire/40 hover:text-primaire-texte",
              )}
            >
              <o.icone className="size-4" aria-hidden /> {o.libelle}
            </Link>
          );
        })}
      </div>

      {/* ── Titre de l'onglet ───────────────────────────────────────── */}
      <div className="animate-apparition-haut delai-1 mt-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-titre text-[17px] leading-6 font-semibold">{actif.titre}</h2>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-encre">{actif.description}</p>
        </div>
        <a
          href={actif.modele}
          download
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-primaire/30 bg-primaire/10 px-4 text-[14px] font-semibold text-primaire-texte transition hover:border-primaire/60 hover:bg-primaire/15"
        >
          <Download className="size-4" aria-hidden /> Télécharger le modèle CSV
        </a>
      </div>

      {/* ── Tout en PLEINE LARGEUR, empilé (plus de grille 3/5-2/5) ─── */}
      {/* [&>*]:min-w-0 : sans lui, un contenu « nowrap » (ex. lignes
          truncate du formulaire) regonfle le pigeon à ~606 px et la
          page déborde/coupe sur mobile (corrigé Lot 23c). */}
      <div className="mt-4 grid gap-5 [&>*]:min-w-0">
        {/* ── Formulaire d'import ─────────────────────────────────────── */}
        <Carte className="animate-apparition-haut delai-2">
          <ImportCsv
            action={
              actif.cle === "outils"
                ? importerOutilsAction
                : actif.cle === "tutoriels"
                  ? importerTutorielsAction
                  : importerPromptsAction
            }
            libelleBouton={`Importer les ${actif.libelle.toLowerCase()}`}
            cible={actif.cible}
          />
        </Carte>

        {/* ── Documentation des colonnes (tableau fluide pleine largeur) ── */}
        <Carte className="animate-apparition-haut delai-3 overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-adm-bordure px-5 py-3.5">
            <FileSpreadsheet className="size-4 text-primaire" aria-hidden />
            <h3 className="font-titre text-[15px] leading-5 font-semibold">
              Colonnes acceptées — {actif.libelle}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px] leading-5">
              <thead className="text-left text-legende text-encre">
                <tr>
                  <th className="w-56 px-5 py-3">Colonne</th>
                  <th className="px-3 py-3">Règle</th>
                  <th className="w-80 px-5 py-3">Exemple</th>
                </tr>
              </thead>
              <tbody>
                {actif.colonnes.map((c) => (
                  <tr key={c.nom} className="border-t border-bordure align-top">
                    <td className="px-5 py-3">
                      <code className="rounded bg-gris px-1.5 py-0.5 text-[12px] font-bold text-adm-sombre">{c.nom}</code>
                      {c.requis && (
                        <span className="ml-1.5 inline-flex rounded-full bg-adm-erreur-doux px-1.5 py-0.5 text-[10px] leading-3 font-bold text-[#c94f35]">
                          requis
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-encre">{c.note}</td>
                    <td className="max-w-80 px-5 py-3 text-adm-gris">
                      <span className="block truncate" title={c.exemple}>{c.exemple}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>

        {/* ── Astuces ─────────────────────────────────────────────────── */}
        <Carte className="animate-apparition-haut delai-3 p-5">
          <p className="flex items-start gap-2 text-[13px] leading-5 text-encre">
            <Info className="mt-0.5 size-4 shrink-0 text-primaire" aria-hidden />
            <span>
              <strong className="font-semibold text-adm-sombre">Astuces :</strong> le nom des
              colonnes ignore majuscules, accents et espaces (« Tarif Min » = <code>tarifmin</code>) ;
              les colonnes en trop sont ignorées ; les cellules qui contiennent un « ; » ou des
              sauts de ligne doivent être mises entre guillemets doubles.
            </span>
          </p>
        </Carte>
      </div>
    </div>
  );
}