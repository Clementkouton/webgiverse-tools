// components/paiement/bouton-payer.tsx
"use client";
// ─────────────────────────────────────────────────────────────────
// Bouton « Choisir Pro / Entreprise » — parcours de paiement Chariow :
//   1. Appelle NOTRE API /api/paiements/chariow/checkout (le serveur
//      crée la session de paiement avec e-mail + nom déjà remplis) ;
//   2. Première fois seulement → petite modale pour demander le numéro
//      de téléphone (obligatoire pour Mobile Money) ;
//   3. Puis :
//        • mode « embed »  → le paiement s'affiche DANS la plateforme
//          (iframe plein écran) : l'utilisateur ne la quitte jamais ;
//        • mode « redirect » → redirection dans le MÊME onglet ;
//   4. Après le paiement → retour automatique /paiement/retour.
//
// Si l'utilisateur n'est pas connecté (401) → envoi vers /connexion
// avec retour automatique sur la page d'origine après connexion.
// ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Champ, Etiquette } from "@/components/ui/champ";
import type { ClePlan } from "@/lib/plans";

/** Pays les plus courants pour Mobile Money / carte (code ISO 3166-1). */
const PAYS = [
  { code: "CI", nom: "Côte d'Ivoire" },
  { code: "SN", nom: "Sénégal" },
  { code: "CM", nom: "Cameroun" },
  { code: "BJ", nom: "Bénin" },
  { code: "BF", nom: "Burkina Faso" },
  { code: "ML", nom: "Mali" },
  { code: "TG", nom: "Togo" },
  { code: "GA", nom: "Gabon" },
  { code: "CG", nom: "Congo" },
  { code: "CD", nom: "RD Congo" },
  { code: "GN", nom: "Guinée" },
  { code: "NE", nom: "Niger" },
  { code: "TD", nom: "Tchad" },
  { code: "MA", nom: "Maroc" },
  { code: "DZ", nom: "Algérie" },
  { code: "TN", nom: "Tunisie" },
  { code: "NG", nom: "Nigéria" },
  { code: "GH", nom: "Ghana" },
  { code: "FR", nom: "France" },
  { code: "BE", nom: "Belgique" },
  { code: "CA", nom: "Canada" },
  { code: "US", nom: "États-Unis" },
];

type Etat = "repos" | "chargement" | "telephone" | "iframe" | "redirection";

export function BoutonPayer({
  plan,
  nomPlan,
  libelle,
  className,
}: {
  plan: ClePlan;
  nomPlan: string;
  /** Texte du bouton (par défaut : « Choisir {nomPlan} »). */
  libelle?: string;
  className?: string;
}) {
  const [etat, setEtat] = useState<Etat>("repos");
  const [message, setMessage] = useState<string | null>(null);
  const [pays, setPays] = useState("");
  const [numero, setNumero] = useState("");
  const [urlPaiement, setUrlPaiement] = useState<string | null>(null);
  const chemin = usePathname();

  /** Appelle l'API puis affiche l'iframe / redirige / demande le téléphone. */
  async function demarrer(telephone?: string, paysTelephone?: string) {
    setEtat("chargement");
    setMessage(null);
    try {
      const reponse = await fetch("/api/paiements/chariow/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, telephone, paysTelephone }),
      });

      // Non connecté → page de connexion, retour automatique après.
      if (reponse.status === 401) {
        window.location.href = `/connexion?suite=${encodeURIComponent(chemin || "/tarifs")}`;
        return;
      }

      // Contrat défensif de la route : l'URL peut arriver sous 3 clés.
      const donnees = (await reponse.json().catch(() => ({}))) as {
        besoinTelephone?: boolean;
        url?: string;
        checkoutUrl?: string;
        checkout_url?: string;
        mode?: string;
        message?: string;
      };

      // Numéro de téléphone pas encore connu → petite modale.
      if (donnees.besoinTelephone) {
        setEtat("telephone");
        return;
      }

      const url = donnees.url ?? donnees.checkoutUrl ?? donnees.checkout_url ?? null;
      if (url) {
        if (donnees.mode === "embed") {
          // Paiement INTÉGRÉ : iframe plein écran, on ne quitte pas la plateforme.
          setUrlPaiement(url);
          setEtat("iframe");
        } else {
          // Redirection dans le MÊME onglet — jamais _blank.
          setEtat("redirection");
          window.location.href = url;
        }
        return;
      }

      setMessage(donnees.message ?? "Une erreur est survenue. Réessaie.");
      setEtat("repos");
    } catch {
      setMessage("Connexion impossible. Vérifie internet puis réessaie.");
      setEtat("repos");
    }
  }

  // ── Paiement intégré (iframe plein écran) ───────────────────────
  if (etat === "iframe" && urlPaiement) {
    return (
      <>
        <Bouton className={className} disabled>
          {libelle ?? `Choisir ${nomPlan}`}
        </Bouton>
        <div
          className="fixed inset-0 z-50 flex flex-col bg-bleu/70 p-2 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Paiement sécurisé"
        >
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 pb-2">
            <p className="flex items-center gap-2 text-[14px] leading-5 font-semibold text-white">
              <Lock className="size-4 shrink-0" aria-hidden />
              Paiement sécurisé — plan {nomPlan}
            </p>
            <button
              type="button"
              onClick={() => setEtat("repos")}
              aria-label="Fermer"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-bleu transition hover:bg-gris"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="mx-auto w-full max-w-4xl flex-1 overflow-hidden rounded-carte bg-white shadow-2xl">
            <iframe
              src={urlPaiement}
              title="Page de paiement sécurisée"
              className="size-full"
              allow="payment *; clipboard-write"
            />
          </div>
          <p className="mx-auto max-w-4xl pt-2 text-center text-[12px] leading-4 text-white/80">
            La page de paiement ne s&apos;affiche pas ?{" "}
            <a href={urlPaiement} className="font-semibold underline">
              Ouvre le paiement ici
            </a>{" "}
            — tu reviendras automatiquement sur Webgiverse après.
          </p>
        </div>
      </>
    );
  }

  // ── Modale « numéro de téléphone » (première fois seulement) ────
  if (etat === "telephone") {
    return (
      <>
        <Bouton className={className} disabled>
          {libelle ?? `Choisir ${nomPlan}`}
        </Bouton>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bleu/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Informations de paiement"
          onClick={() => setEtat("repos")}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <Carte className="relative p-6">
              <button
                type="button"
                onClick={() => setEtat("repos")}
                aria-label="Fermer"
                className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-encre hover:bg-gris"
              >
                <X className="size-5" aria-hidden />
              </button>
              <h2 className="flex items-center gap-2 text-h3 font-semibold">
                <Lock className="size-5 text-violet" aria-hidden /> Paiement
                sécurisé
              </h2>
              <p className="mt-2 text-[14px] leading-5 text-encre">
                Plan <strong>{nomPlan}</strong> — ton e-mail, ton nom et ton
                numéro seront <strong>déjà remplis</strong> sur la page de
                paiement. Il ne te restera qu&apos;à choisir Mobile Money ou
                carte et valider.
              </p>
              <form
                className="mt-5 grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  demarrer(numero, pays);
                }}
              >
                <div>
                  <Etiquette htmlFor="pays-telephone">Pays du numéro</Etiquette>
                  <select
                    id="pays-telephone"
                    required
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    className="w-full min-h-11 rounded-champ border border-bordure bg-white px-4 text-[16px] leading-6 text-bleu focus:border-violet focus:outline-none"
                  >
                    <option value="" disabled>
                      Choisis ton pays
                    </option>
                    {PAYS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Etiquette htmlFor="numero-telephone">
                    Numéro de téléphone
                  </Etiquette>
                  <Champ
                    id="numero-telephone"
                    required
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="Ex. 07 01 02 03 04"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                  <p className="mt-1 text-[12px] leading-4 text-encre">
                    Sans l&apos;indicatif du pays. Il sert uniquement au
                    paiement Mobile Money.
                  </p>
                </div>
                {message && (
                  <p className="text-[13px] leading-5 font-medium text-red-600">
                    {message}
                  </p>
                )}
                <Bouton type="submit" disabled={etat === "chargement"} className="w-full">
                  {etat === "chargement" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />{" "}
                      Préparation…
                    </>
                  ) : (
                    <>
                      Continuer vers le paiement{" "}
                      <Lock className="size-4" aria-hidden />
                    </>
                  )}
                </Bouton>
                <p className="flex items-center justify-center gap-1.5 text-center text-[12px] leading-4 text-encre">
                  <ShieldCheck className="size-3.5 shrink-0 text-violet" aria-hidden />
                  Traitement par Chariow — Webgiverse ne voit jamais tes codes.
                </p>
              </form>
            </Carte>
          </div>
        </div>
      </>
    );
  }

  // ── Bouton normal ───────────────────────────────────────────────
  return (
    <Bouton
      className={className}
      onClick={() => demarrer()}
      disabled={etat === "chargement" || etat === "redirection"}
    >
      {(etat === "chargement" || etat === "redirection") && (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      )}
      {etat === "redirection"
        ? "Redirection vers le paiement…"
        : etat === "chargement"
          ? "Préparation du paiement…"
          : (libelle ?? `Choisir ${nomPlan}`)}
    </Bouton>
  );
}