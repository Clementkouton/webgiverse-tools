// components/tarifs/checkout-paiement.tsx
"use client";
// Formulaire de paiement :
//  - mode SIMULATION : formulaire factice (aucun argent réel) → /api/paiements/simuler
//  - mode RÉEL : redirection vers le checkout officiel Moneroo
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

type Etape = "formulaire" | "enCours" | "reussi" | "echoue";

export function CheckoutPaiement({
  plan,
  nomPlan,
  prix,
  simulation,
}: {
  plan: string;
  nomPlan: string;
  prix: string;
  simulation: boolean;
}) {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("formulaire");
  const [message, setMessage] = useState("");
  const [carte, setCarte] = useState("4084 0840 8408 4081");
  const [expiration, setExpiration] = useState("12/34");
  const [cvv, setCvv] = useState("408");

  async function payer(reussite: boolean) {
    setEtape("enCours");
    setMessage("");
    try {
      // 1) Créer le paiement (le serveur fixe lui-même le montant).
      const reponseInit = await fetch("/api/paiements/initier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const donneesInit = await reponseInit.json();
      if (!reponseInit.ok) {
        setEtape("echoue");
        setMessage(donneesInit.message ?? "L'initialisation du paiement a échoué.");
        return;
      }

      // 2a) Mode réel : Moneroo ouvre sa page de paiement sécurisée.
      if (!donneesInit.simulation) {
        window.location.href = donneesInit.url as string;
        return;
      }

      // 2b) Mode simulation : on conclut le paiement factice.
      const reponseSim = await fetch("/api/paiements/simuler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: donneesInit.reference, reussite }),
      });
      const donneesSim = await reponseSim.json();
      if (!reponseSim.ok) {
        setEtape("echoue");
        setMessage(donneesSim.message ?? "La simulation a échoué.");
        return;
      }

      // 3) Page de confirmation.
      router.push(`/tarifs/retour?reference=${encodeURIComponent(donneesInit.reference)}`);
    } catch {
      setEtape("echoue");
      setMessage("Erreur réseau : réessaie dans un instant.");
    }
  }

  if (etape === "reussi" || etape === "echoue") {
    return (
      <div className="grid gap-4 text-center">
        <p className={`text-[15px] leading-6 font-semibold ${etape === "reussi" ? "text-violet" : "text-red-600"}`}>
          {message || (etape === "reussi" ? "Paiement confirmé !" : "Paiement annulé.")}
        </p>
        <Bouton asChild variante="secondaire">
          <a href={etape === "reussi" ? "/dashboard/abonnement" : "/tarifs/paiement?plan=" + plan}>
            {etape === "reussi" ? "Voir mon abonnement" : "Réessayer"}
          </a>
        </Bouton>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Récapitulatif */}
      <div className="flex items-center justify-between rounded-champ bg-gris px-4 py-3">
        <span className="text-[15px] leading-5 font-semibold">Plan {nomPlan} — 30 jours</span>
        <span className="font-titre text-[20px] font-bold text-violet">{prix}</span>
      </div>

      {simulation ? (
        <>
          <p className="rounded-carte border border-bordure bg-gris/60 px-4 py-3 text-[13px] leading-5 text-encre">
            <strong>Mode simulation</strong> — aucun argent réel ne circule. Les champs ci-dessous
            sont factices : laisse-les tels quels. Tu verras exactement le même parcours quand tu
            brancheras tes clés réelles Moneroo.
          </p>

          <div>
            <label htmlFor="carte" className="block text-[14px] leading-5 font-semibold">
              Numéro de carte (fictif)
            </label>
            <div className="relative mt-1.5">
              <CreditCard className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-encre" aria-hidden />
              <input
                id="carte"
                value={carte}
                onChange={(e) => setCarte(e.target.value)}
                inputMode="numeric"
                className="min-h-11 w-full rounded-champ border border-bordure bg-white pr-3 pl-10 text-[15px] leading-5 focus:border-violet focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiration" className="block text-[14px] leading-5 font-semibold">
                Expiration
              </label>
              <input
                id="expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="cvv" className="block text-[14px] leading-5 font-semibold">
                CVV
              </label>
              <input
                id="cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none"
              />
            </div>
          </div>

          <Bouton onClick={() => payer(true)} disabled={etape === "enCours"} className="min-h-12 text-[15px]">
            {etape === "enCours" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Traitement…
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden /> Payer {prix}
              </>
            )}
          </Bouton>
          <button
            type="button"
            onClick={() => payer(false)}
            disabled={etape === "enCours"}
            className="text-[13px] leading-4 font-medium text-encre underline hover:text-red-600"
          >
            Simuler un échec de paiement (pour tester)
          </button>
        </>
      ) : (
        <>
          <p className="rounded-carte border border-bordure bg-gris/60 px-4 py-3 text-[13px] leading-5 text-encre">
            Tu vas être redirigé vers la page de paiement <strong>sécurisée de Moneroo</strong> :
            Mobile Money (MTN, Moov, Orange, Wave…), cartes Visa / Mastercard, selon ton pays. Tu
            reviendras automatiquement sur Webgiverse une fois le paiement terminé.
          </p>
          <Bouton onClick={() => payer(true)} disabled={etape === "enCours"} className="min-h-12 text-[15px]">
            {etape === "enCours" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Redirection…
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden /> Payer {prix} avec Moneroo
              </>
            )}
          </Bouton>
        </>
      )}
    </div>
  );
}