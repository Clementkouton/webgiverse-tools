// components/tutoriels/lecteur-youtube.tsx
// Lot 13 — lecteur YouTube officiel (IFrame Player API) avec détection
// d'erreurs. REMPLACE l'iframe directe youtube-nocookie qui affichait
// « Une erreur s'est produite (code 153) » sur des vidéos pourtant
// intégrables (bug connu du domaine nocookie) sans qu'aucun site ne
// puisse le détecter ni le gérer.
//
// Correctif v2 (après l'article officiel YouTube « Provide a HTTP referer
// header to enable video playback » — support.google.com/youtube/answer/171780) :
//  - YouTube exige désormais un Referer valide sur les lecteurs intégrés ;
//    sans cela, la lecture est bloquée avec l'erreur 153. Cela arrive avec
//    certains navigateurs anti-pistage, bloqueurs de publicités, ou quand
//    la page est ouverte via une IP locale (192.168.x.x) ou un tunnel dev.
//  - Face à une erreur 101/150/153, le lecteur retente AUTOMATIQUEMENT une
//    fois sans le paramètre `origin` (les deux configurations ont été
//    validées en test) avant d'afficher l'écran de secours.
//  - L'écran de secours explique la cause probable (référent bloqué) et
//    propose « Voir sur YouTube » + « Réessayer ».
//
// Fonctionnement :
//  - L'API officielle https://www.youtube.com/iframe_api est chargée
//    une seule fois (domaine standard youtube.com, pas nocookie).
//  - Si l'API ne répond pas en 12 s (bloqueur de scripts, réseau) →
//    repli sur une iframe classique, comme avant.
//  - L'identifiant est normalisé : si la base contient un jour une URL
//    complète (watch?v=…, youtu.be/…), on en extrait l'ID à 11 caractères.
"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw, TriangleAlert } from "lucide-react";

type JoueurYT = { destroy?: () => void };
type FenetreYT = Window & {
  YT?: {
    Player: new (hote: HTMLElement, options: Record<string, unknown>) => JoueurYT;
  };
  onYouTubeIframeAPIReady?: () => void;
};

type Etat =
  | { genre: "chargement" } // l'API se charge, le lecteur s'initialise
  | { genre: "actif" } // lecteur prêt : rien d'autre à afficher
  | { genre: "erreur"; code: number } // le lecteur a signalé une erreur
  | { genre: "repli" }; // API non chargée → iframe simple sans détection

let promesseApi: Promise<void> | null = null;

/** Charge l'API IFrame YouTube une seule fois par page (script officiel). */
function chargerApiYouTube(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as FenetreYT;
  if (w.YT?.Player) return Promise.resolve();
  promesseApi ??= new Promise<void>((resoudre) => {
    const precedente = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      precedente?.();
      resoudre();
    };
    if (!document.querySelector("script[data-api-youtube]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.apiYoutube = "1";
      document.head.appendChild(script);
    }
  });
  return promesseApi;
}

/** Extrait un ID YouTube à 11 caractères, même si la base stocke une URL complète. */
function normaliserId(valeur: string): string {
  const v = valeur.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : v;
}

/** Codes qui concernent l'intégration (le reste : vidéo invalide/absente). */
function estErreurIntegration(code: number): boolean {
  return code === 101 || code === 150 || code === 153;
}

/** Message en français selon le code d'erreur renvoyé par le lecteur. */
function messageErreur(code: number): string {
  if (estErreurIntegration(code)) {
    return "YouTube n'a pas pu vérifier l'origine de cette page (référent absent ou bloqué), ou la vidéo refuse l'intégration.";
  }
  if (code === 100) return "Cette vidéo a été supprimée ou rendue privée sur YouTube.";
  if (code === 2 || code === 5) return "Lecture impossible : cette vidéo semble invalide.";
  return "Une erreur technique empêche la lecture de cette vidéo.";
}

/** Conseil pratique affiché sous le message (piste de résolution côté visiteur). */
function conseilErreur(code: number): string {
  if (estErreurIntegration(code)) {
    return "Un bloqueur de publicités ou un navigateur anti-pistage (Brave…) peut provoquer cela : autorise ce site, puis réessaie. En local, utilise http://localhost:3000 plutôt que l'adresse IP du réseau.";
  }
  return "";
}

export function LecteurYoutube({
  youtubeId,
  titre,
  miniature,
}: {
  youtubeId: string; // ID YouTube (11 caractères) — déjà contrôlé par la page
  titre: string; // titre du tuto (attribut title de l'iframe / a11y)
  miniature?: string | null; // vignette à montrer dans le voile de secours
}) {
  const id = normaliserId(youtubeId);
  const hoteRef = useRef<HTMLDivElement>(null);
  const joueurRef = useRef<JoueurYT | null>(null);
  const [etat, setEtat] = useState<Etat>({ genre: "chargement" });
  const [tentative, setTentative] = useState(0);
  // 2e essai automatique : recréer le lecteur SANS le paramètre `origin`
  // (certains contextes — tunnel dev, IP locale — rejettent l'origin
  // alors que l'embed « nu » passe).
  const [planB, setPlanB] = useState(false);

  useEffect(() => {
    let abandon = false;
    setEtat({ genre: "chargement" });

    // Si l'API ne s'initialise pas en 12 s (script bloqué, réseau lent),
    // on bascule sur l'iframe classique plutôt que sur un écran noir.
    const minuterie = setTimeout(() => {
      if (!abandon) setEtat((v) => (v.genre === "chargement" ? { genre: "repli" } : v));
    }, 12000);

    chargerApiYouTube()
      .then(() => {
        if (abandon || !hoteRef.current) return;
        const hote = document.createElement("div");
        hoteRef.current.replaceChildren(hote);
        const vars: Record<string, unknown> = { rel: 0, modestbranding: 1, playsinline: 1 };
        // `origin` : recommandé par la doc YouTube pour les embeds tierces —
        // mais on le retire au 2e essai si YouTube l'a refusé (erreur 153).
        if (!planB) vars.origin = window.location.origin;
        try {
          joueurRef.current = new (window as FenetreYT).YT!.Player(hote, {
            videoId: id,
            playerVars: vars,
            events: {
              onReady: () => {
                if (!abandon) {
                  clearTimeout(minuterie);
                  setEtat({ genre: "actif" }); // lecteur prêt, plus rien à montrer
                }
              },
              onError: (e: { data?: number }) => {
                if (abandon) return;
                clearTimeout(minuterie);
                const code = e.data ?? 0;
                // Erreur d'intégration et 1er essai → on retente sans `origin`
                // avant d'afficher l'écran de secours (invisible si la vidéo joue).
                if (estErreurIntegration(code) && !planB) {
                  setPlanB(true);
                  setTentative((t) => t + 1);
                  return;
                }
                setEtat({ genre: "erreur", code });
              },
            },
          });
        } catch {
          clearTimeout(minuterie);
          if (!abandon) setEtat({ genre: "repli" });
        }
      })
      .catch(() => {
        clearTimeout(minuterie);
        if (!abandon) setEtat({ genre: "repli" });
      });

    return () => {
      abandon = true;
      clearTimeout(minuterie);
      try {
        joueurRef.current?.destroy?.();
      } catch {
        // lecteur déjà détruit : rien à faire
      }
      joueurRef.current = null;
    };
  }, [id, tentative, planB]);

  const vignette = miniature || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className="absolute inset-0">
      {/* Hôte du lecteur : React ne touche jamais au DOM géré par YouTube. */}
      <div ref={hoteRef} className="absolute inset-0 [&_iframe]:size-full" aria-label={titre} />

      {etat.genre === "repli" && (
        // Repli dégradé : l'API n'est pas disponible → iframe simple (comme avant le Lot 13).
        // referrerPolicy explicite : garantit l'envoi de l'origine au lecteur
        // (exigence YouTube — support.google.com/youtube/answer/171780).
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0`}
          title={titre}
          className="absolute inset-0 size-full"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      {etat.genre === "erreur" && (
        // Voile de secours : au lieu de l'erreur brute de YouTube, un écran
        // clair qui explique la cause et permet quand même de regarder la vidéo.
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bleu p-4 text-center text-white sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vignette} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
          <div className="relative">
            <span className="mx-auto grid size-12 place-items-center rounded-carte border border-white/20 bg-white/10">
              <TriangleAlert className="size-6" aria-hidden />
            </span>
            <p className="mt-3 font-titre text-[17px] leading-6 font-semibold">
              Impossible de lire la vidéo ici
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-5 text-white/80">
              {messageErreur(etat.code)}
            </p>
            {conseilErreur(etat.code) && (
              <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-5 text-white/60">
                {conseilErreur(etat.code)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <a
                href={`https://www.youtube.com/watch?v=${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[14px] leading-5 font-semibold text-white transition hover:brightness-110"
              >
                <ExternalLink className="size-4" aria-hidden /> Voir sur YouTube
              </a>
              <button
                type="button"
                onClick={() => {
                  setPlanB(false);
                  setTentative((t) => t + 1);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-[14px] leading-5 font-semibold text-white transition hover:bg-white/20"
              >
                <RotateCcw className="size-4" aria-hidden /> Réessayer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}