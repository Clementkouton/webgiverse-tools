// components/auth/formulaire-auth.tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Etiquette } from "@/components/ui/champ";
import { LogIn, Mail } from "lucide-react";

export function FormulaireAuth({ mode }: { mode: "connexion" | "inscription" }) {
  const router = useRouter();
  const parametres = useSearchParams();
  const suite = parametres.get("suite") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [etat, setEtat] = useState<{ type: "erreur" | "info"; message: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const credentialsActifs = process.env.NEXT_PUBLIC_CREDENTIALS_ACTIFS === "true";

  async function lienMagique(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true); setEtat(null);
    const resultat = await signIn("email", { email, redirectTo: suite, redirect: false });
    setEnCours(false);
    setEtat(resultat?.error
      ? { type: "erreur", message: "Envoi impossible. Vérifie l'adresse et réessaie." }
      : { type: "info", message: "Lien magique envoyé ! Vérifie ta boîte mail (et tes spams), puis clique dessus." });
  }

  async function avecIdentifiants(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true); setEtat(null);
    const resultat = await signIn("credentials", { email, password: motDePasse, redirect: false });
    setEnCours(false);
    if (resultat?.error) setEtat({ type: "erreur", message: "Identifiants incorrects." });
    else router.push(suite);
  }

  return (
    <div className="grid gap-4">
      <Bouton variante="secondaire" onClick={() => signIn("google", { redirectTo: suite })}>
        Continuer avec Google
      </Bouton>

      <div className="flex items-center gap-3 text-legende text-encre" aria-hidden>
        <span className="h-px flex-1 bg-bordure" /> ou par e-mail <span className="h-px flex-1 bg-bordure" />
      </div>

      <form onSubmit={lienMagique} className="grid gap-2">
        <Etiquette htmlFor="auth-email">Adresse e-mail</Etiquette>
        <Champ id="auth-email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" autoComplete="email" />
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Envoi…" : mode === "connexion" ? "Recevoir un lien de connexion" : "Créer mon compte par e-mail"} <Mail aria-hidden />
        </Bouton>
      </form>

      {credentialsActifs && (
        <form onSubmit={avecIdentifiants} className="grid gap-2 rounded-carte border border-bordure bg-white p-4">
          <p className="text-[13px] leading-5 text-encre">Environnement de test — identifiants :</p>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Mot de passe" aria-label="Mot de passe"
            className="min-h-11 rounded-champ border border-bordure px-4 focus:border-violet focus:outline-none" />
          <Bouton variante="secondaire" type="submit" disabled={enCours}><LogIn aria-hidden /> Se connecter</Bouton>
        </form>
      )}

      {etat && (
        <p role="status" className={`text-[14px] leading-5 ${etat.type === "erreur" ? "text-red-600" : "text-[#00845c]"}`}>
          {etat.message}
        </p>
      )}
    </div>
  );
}