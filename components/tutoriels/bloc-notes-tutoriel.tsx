// components/tutoriels/bloc-notes-tutoriel.tsx
// Lot 29 + Lot 35 — prise de notes PERSONNELLE sur un tutoriel vidéo.
// Nouveautés Lot 35 : réservée aux abonnés PREMIUM (la page n'affiche
// l'éditeur que si capacité « notes », l'action serveur re-vérifie) et
// EXPORT DES NOTES : Markdown, TXT et « Imprimer / PDF » — 100 %
// navigateur, aucune dépendance. Le reste est inchangé (Lot 29).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Crown,
  FileDown,
  FileText,
  Loader2,
  LogIn,
  NotebookPen,
  Printer,
  Save,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ZoneTexte } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { majNoteTutoriel, supprimerNoteTutoriel } from "@/app/actions/notes";

type Props = {
  tutoId: string;
  /** Titre du tutoriel : en-tête des exports et nom de fichier. */
  tutoTitre: string;
  /** Note existante chargée côté serveur (null si aucune). */
  noteInitiale: string | null;
  connecte: boolean;
  /** L'utilisateur a-t-il un abonnement Premium actif ? */
  premium: boolean;
  /** Lien de connexion quand l'utilisateur n'est pas connecté. */
  hrefConnexion: string;
};

/* ════════════════════════════════════════════════════════════════
   EXPORT DES NOTES (100 % navigateur, aucune dépendance)
   ════════════════════════════════════════════════════════════════ */

/** Nom de fichier propre : « Installation de n8n » → installation-de-n8n. */
function slugFichier(titre: string): string {
  return (
    titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "notes"
  );
}

function aujourdhui(): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
}

/** Déclenche le téléchargement d'un fichier texte généré à la volée. */
function telecharger(nom: string, contenu: string, mime: string): void {
  const blob = new Blob([contenu], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exporterMarkdown(titre: string, texte: string): void {
  const contenu =
    `# Notes — ${titre}\n\n` +
    `> Tutoriel Webgiverse · Notes privées · Exportées le ${aujourdhui()}\n\n${texte}\n`;
  telecharger(`${slugFichier(titre)}-notes.md`, contenu, "text/markdown");
}

function exporterTxt(titre: string, texte: string): void {
  const separateur = "=".repeat(50);
  const contenu =
    `NOTES — ${titre}\n` +
    `Tutoriel Webgiverse · Notes privées · Exportées le ${aujourdhui()}\n` +
    `${separateur}\n\n${texte}\n`;
  telecharger(`${slugFichier(titre)}-notes.txt`, contenu, "text/plain");
}

function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ouvre une fenêtre de mise en page propre puis lance l'impression. */
function imprimerNote(titre: string, texte: string): boolean {
  const fenetre = window.open("", "_blank", "width=820,height=940");
  if (!fenetre) return false; // bloqueur de fenêtres surgissantes
  fenetre.document.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />` +
      `<title>Notes — ${echapperHtml(titre)}</title><style>` +
      `body{font-family:Georgia,'Times New Roman',serif;color:#1a2332;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6}` +
      `h1{font-size:22px;margin:0 0 4px}p.meta{color:#5a6b85;font-size:13px;margin:0 0 20px}` +
      `hr{border:none;border-top:2px solid #6a3bff;margin:16px 0 24px}` +
      `.notes{white-space:pre-wrap;font-size:15px}` +
      `</style></head><body><h1>Notes — ${echapperHtml(titre)}</h1>` +
      `<p class="meta">Tutoriel Webgiverse · Notes privées · Exportées le ${aujourdhui()}</p>` +
      `<hr /><div class="notes">${echapperHtml(texte)}</div>` +
      `<script>window.addEventListener('load',function(){window.print()})</script>` +
      `</body></html>`,
  );
  fenetre.document.close();
  fenetre.focus();
  return true;
}

/* ════════════════════════════════════════════════════════════════
   COMPOSANT
   ════════════════════════════════════════════════════════════════ */
export function BlocNotesTutoriel({
  tutoId,
  tutoTitre,
  noteInitiale,
  connecte,
  premium,
  hrefConnexion,
}: Props) {
  const [texte, setTexte] = useState(noteInitiale ?? "");
  const [sauvegarde, setSauvegarde] = useState(noteInitiale ?? "");
  const [etat, setEtat] = useState<"repos" | "enCours" | "ok" | "efface">("repos");
  const [echec, setEchec] = useState<string | null>(null);

  // La note a-t-elle vraiment changé depuis la dernière sauvegarde ?
  const modifie = texte !== sauvegarde;

  // Après un succès (« ok » / « efface »), retour au repos après 2,5 s.
  useEffect(() => {
    if (etat !== "ok" && etat !== "efface") return;
    const minuteur = setTimeout(() => setEtat("repos"), 2500);
    return () => clearTimeout(minuteur);
  }, [etat]);

  // ── Visiteur non connecté : invitation ──────────────────────────
  if (!connecte) {
    return (
      <div className="rounded-carte border border-bordure bg-gris/40 p-5">
        <p className="flex items-center gap-2.5 font-titre text-[15px] leading-5 font-bold text-bleu">
          <span className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
            <NotebookPen className="size-4" />
          </span>
          Prends des notes pendant la vidéo
        </p>
        <p className="mt-2 text-[13px] leading-5 text-encre">
          Connecte-toi pour noter ce que tu apprends. Tes notes restent privées,
          sont retrouvées dans ton espace — et l&apos;export (PDF, Markdown, TXT)
          est inclus dans les plans Premium.
        </p>
        <Bouton asChild variante="secondaire" taille="sm" className="mt-3">
          <Link href={hrefConnexion}>
            <LogIn aria-hidden /> Me connecter
          </Link>
        </Bouton>
      </div>
    );
  }

  // ── Connecté sans abonnement : cadre verrouillé ──────────────────
  if (!premium) {
    return (
      <section
        aria-label="Mes notes sur ce tutoriel — réservé aux abonnés Premium"
        className="rounded-carte border border-bordure bg-white p-5 shadow-carte"
      >
        <p className="flex flex-wrap items-center gap-2.5 font-titre text-[15px] leading-5 font-bold text-bleu">
          <span className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
            <Crown className="size-4" />
          </span>
          Mes notes sur ce tutoriel
          <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet">
            Premium
          </span>
        </p>
        <p className="mt-2 text-[13px] leading-5 text-encre">
          La prise de notes privée et son export (PDF, Markdown, TXT) sont
          inclus dans les plans <strong className="text-bleu">Pro</strong> et{" "}
          <strong className="text-bleu">Entreprise</strong>. Passe Premium pour
          noter ce que tu apprends et retrouver tes notes dans ton espace.
        </p>
        <Bouton asChild taille="sm" className="mt-3">
          <Link href="/tarifs">
            <Sparkles aria-hidden /> Débloquer avec Premium
          </Link>
        </Bouton>
      </section>
    );
  }

  function messageDEchec(raison?: string) {
    if (raison === "premium") {
      return "La prise de notes est réservée aux abonnés Premium — passe Premium depuis la page Tarifs.";
    }
    if (raison === "base") {
      return "Notes pas encore activées sur la base : lance npx prisma db push dans le terminal du projet, puis recharge la page.";
    }
    if (raison === "client") {
      return "Client Prisma non régénéré : arrête le serveur (Ctrl+C), lance npx prisma db push puis npx prisma generate, et relance npm run dev.";
    }
    if (raison === "invalide") {
      return "Note trop longue (10 000 caractères maximum) — raccourcis-la un peu.";
    }
    return "Action impossible pour le moment — réessaie dans un instant.";
  }

  async function enregistrer() {
    if (etat === "enCours" || !modifie) return;
    setEtat("enCours");
    setEchec(null);
    try {
      const resultat = await majNoteTutoriel(tutoId, texte);
      if (resultat.ok) {
        setSauvegarde(texte.trim());
        setEtat("ok");
      } else {
        setEchec(messageDEchec(resultat.raison));
        setEtat("repos");
      }
    } catch (erreur) {
      console.error("Enregistrement de la note impossible :", erreur);
      setEchec("Action impossible pour le moment — réessaie dans un instant.");
      setEtat("repos");
    }
  }

  async function effacer() {
    if (etat === "enCours") return;
    setEtat("enCours");
    setEchec(null);
    try {
      const resultat = await supprimerNoteTutoriel(tutoId);
      if (resultat.ok) {
        setTexte("");
        setSauvegarde("");
        setEtat("efface");
      } else {
        setEchec(messageDEchec(resultat.raison));
        setEtat("repos");
      }
    } catch (erreur) {
      console.error("Suppression de la note impossible :", erreur);
      setEchec("Action impossible pour le moment — réessaie dans un instant.");
      setEtat("repos");
    }
  }

  return (
    <section aria-label="Mes notes sur ce tutoriel" className="rounded-carte border border-bordure bg-white p-5 shadow-carte">
      <p className="mb-2 flex flex-wrap items-center gap-2.5 font-titre text-[15px] leading-5 font-bold text-bleu">
        <span className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
          <NotebookPen className="size-4" />
        </span>
        Mes notes sur ce tutoriel
        <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet">
          Privée — visible de toi seul
        </span>
      </p>

      <ZoneTexte
        rows={6}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            void enregistrer();
          }
        }}
        placeholder="Ce que je retiens de ce tutoriel : étapes clés, astuces, réglages, liens à revoir…"
        aria-label="Mes notes sur le tutoriel"
        className="bg-gris/40 focus:border-violet"
      />

      {/* ── Export des notes (Premium) : présent dès qu'une note existe ── */}
      {sauvegarde && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] leading-4 font-semibold text-encre">Exporter :</span>
          <Bouton
            variante="secondaire"
            taille="sm"
            className="min-h-9 px-3 text-[13px]"
            onClick={() => exporterMarkdown(tutoTitre, sauvegarde)}
          >
            <FileDown aria-hidden /> Markdown
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="sm"
            className="min-h-9 px-3 text-[13px]"
            onClick={() => exporterTxt(tutoTitre, sauvegarde)}
          >
            <FileText aria-hidden /> TXT
          </Bouton>
          <Bouton
            variante="secondaire"
            taille="sm"
            className="min-h-9 px-3 text-[13px]"
            onClick={() => {
              const ok = imprimerNote(tutoTitre, sauvegarde);
              if (!ok) {
                setEchec(
                  "Ton navigateur a bloqué la fenêtre d'impression — autorise les fenêtres surgissantes pour ce site, puis réessaie.",
                );
              }
            }}
          >
            <Printer aria-hidden /> Imprimer / PDF
          </Bouton>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="min-h-4 flex-1 text-[12px] leading-4 text-encre">
          {etat === "ok" && (
            <span className="inline-flex items-center gap-1 font-medium text-green-700">
              <Check className="size-3.5" aria-hidden /> Note enregistrée — retrouvable dans ton espace, rubrique « Mes notes »
            </span>
          )}
          {etat === "efface" && (
            <span className="inline-flex items-center gap-1 font-medium text-green-700">
              <Check className="size-3.5" aria-hidden /> Note supprimée
            </span>
          )}
          {etat === "enCours" && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Enregistrement…
            </span>
          )}
          {!echec && etat === "repos" && modifie && "Pense à enregistrer tes changements (Ctrl + Entrée)"}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          {sauvegarde && (
            <Bouton
              variante="secondaire"
              taille="sm"
              disabled={etat === "enCours"}
              onClick={effacer}
              className="min-h-9 px-3 text-[13px]"
            >
              <Trash2 aria-hidden /> Supprimer
            </Bouton>
          )}
          <Bouton
            variante={etat === "ok" ? "secondaire" : "primaire"}
            taille="sm"
            disabled={!modifie || etat === "enCours" || texte.trim().length === 0}
            onClick={enregistrer}
            className="min-h-9 px-3 text-[13px]"
          >
            {etat === "enCours" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : etat === "ok" ? (
              <Check aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {etat === "enCours" ? "Enregistrement…" : etat === "ok" ? "Enregistrée" : "Enregistrer mes notes"}
          </Bouton>
        </div>
      </div>

      {/* Échec affiché dans le flux, sous les boutons */}
      {echec && (
        <p
          aria-live="polite"
          className="mt-2 flex items-start gap-1.5 rounded-carte border border-amber-300 bg-amber-50 p-2 text-[12px] leading-4 text-encre"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>{echec}</span>
        </p>
      )}
    </section>
  );
}