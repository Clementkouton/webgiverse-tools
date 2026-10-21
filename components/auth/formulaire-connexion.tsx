"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Props = {
  suite?: string;
  apresConnexion?: () => void;
};

export default function FormulaireConnexion({ suite, apresConnexion }: Props) {
  const router = useRouter();
  const destination = suite ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (charge) return;

    setErreur(null);
    setCharge(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        motDePasse,
        password: motDePasse,
      });

      if (res?.error) {
        setErreur("Email ou mot de passe incorrect.");
        setCharge(false);
        return;
      }

      setCharge(false);
      apresConnexion?.();
      router.push(destination);
      router.refresh();
    } catch {
      setErreur("Impossible de se connecter pour le moment. Réessayez.");
      setCharge(false);
    }
  }

  function connexionGoogle() {
    signIn("google", { redirectTo: destination });
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <div>
        <label
          htmlFor="connexion-email"
          className="mb-1 block text-sm font-medium text-encre"
        >
          Email
        </label>
        <input
          id="connexion-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          className="w-full rounded-champ border border-bordure bg-gris px-3 py-2 text-sm text-encre outline-none transition focus:border-violet focus:bg-white"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="connexion-mot-de-passe"
            className="block text-sm font-medium text-encre"
          >
            Mot de passe
          </label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-xs font-medium text-violet hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          id="connexion-mot-de-passe"
          type="password"
          required
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-champ border border-bordure bg-gris px-3 py-2 text-sm text-encre outline-none transition focus:border-violet focus:bg-white"
        />
      </div>

      {erreur && (
        <p className="rounded-champ bg-red-50 px-3 py-2 text-sm text-red-600">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={charge}
        className="w-full rounded-champ bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {charge ? "Connexion en cours..." : "Se connecter"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-bordure" />
        <span className="text-xs text-encre/60">ou</span>
        <span className="h-px flex-1 bg-bordure" />
      </div>

      <button
        type="button"
        onClick={connexionGoogle}
        disabled={charge}
        className="flex w-full items-center justify-center gap-2 rounded-champ border border-bordure bg-white px-4 py-2.5 text-sm font-medium text-encre transition hover:bg-gris disabled:opacity-60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Continuer avec Google
      </button>

      <p className="text-center text-sm text-encre/70">
        Pas encore de compte ?{" "}
        <Link
          href={`/inscription?suite=${encodeURIComponent(destination)}`}
          className="font-medium text-violet hover:underline"
        >
          Créer un compte gratuit
        </Link>
      </p>
    </form>
  );
}