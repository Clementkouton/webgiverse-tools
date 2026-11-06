// components/tutoriels/bloc-notes-tutoriel.tsx
// Lot 29 — prise de notes PERSONNELLE pendant un tutoriel vidéo.
// Apparaît sous la vidéo, sur la page du tutoriel :
//   • Non connecté → invitation à se connecter (les tutoriels sont
//     gratuits : la connexion suffit pour noter) ;
//   • Connecté → éditeur de note privée (une note par membre et par
//     tutoriel), avec les 3 états de l'éditeur de notes du dashboard :
//     repos / enregistrement / enregistrée, raccourci Ctrl+Entrée,
//     bouton « Supprimer » et messages d'échec explicites
//     (npx prisma db push / npx prisma generate).
// Les notes sont ensuite visibles dans l'espace membre :
// Dashboard → Apprendre → « Mes notes » (avec le tutoriel associé).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  LogIn,
  NotebookPen,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ZoneTexte } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { majNoteTutoriel, supprimerNoteTutoriel } from "@/app/actions/notes";

type Props = {
  tutoId: string;
  /** Note existante chargée côté serveur (null si aucune). */
  noteInitiale: string | null;
  connecte: boolean;
  /** Lien de connexion quand l'utilisateur n'est pas connecté. */
  hrefConnexion: string;
};

export function BlocNotesTutoriel({ tutoId, noteInitiale, connecte, hrefConnexion }: Props) {
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

  // ── Visiteur non connecté : invitation (tutoriels gratuits) ─────
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
          Les tutoriels sont gratuits : connecte-toi pour noter ce que tu apprends.
          Tes notes restent privées et sont retrouvées dans ton espace, avec le
          tutoriel associé.
        </p>
        <Bouton asChild variante="secondaire" taille="sm" className="mt-3">
          <Link href={hrefConnexion}>
            <LogIn aria-hidden /> Me connecter
          </Link>
        </Bouton>
      </div>
    );
  }

  function messageDEchec(raison?: string) {
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