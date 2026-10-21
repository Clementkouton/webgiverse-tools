"use client";

import { useState } from "react";
import Link from "next/link";

export default function PageMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [charge, setCharge] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [lien, setLien] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (charge) return;

    setErreur(null);
    setCharge(true);

    try {
      const res = await fetch("/api/mot-de-passe-oublie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErreur(data?.erreur ?? "Une erreur est survenue. Réessayez.");
        setCharge(false);
        return;
      }

      setLien(data?.lien ?? null);
      setEnvoye(true);
    } catch {
      setErreur("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setCharge(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-violet">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-titre text-h2 text-encre">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-encre/70">
            Entrez votre adresse email et nous vous permettrons de définir un
            nouveau mot de passe.
          </p>
        </div>

        {envoye ? (
          <div className="space-y-4">
            <p className="rounded-champ bg-green-50 px-4 py-3 text-sm text-green-700">
              Si un compte existe avec cet email, un lien de réinitialisation a
              été généré. Il est valable 1 heure.
            </p>

            {lien && (
              <div className="rounded-champ border border-bordure bg-gris p-4">
                <p className="mb-2 text-xs text-encre/60">
                  Mode développement : en production, ce lien serait envoyé par
                  email. Pour l'instant, cliquez directement :
                </p>
                <Link
                  href={lien}
                  className="block text-center rounded-champ bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Définir un nouveau mot de passe
                </Link>
              </div>
            )}

            <Link
              href="/connexion"
              className="block text-center text-sm font-medium text-violet hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={soumettre} className="space-y-4">
            <div>
              <label
                htmlFor="oublie-email"
                className="mb-1 block text-sm font-medium text-encre"
              >
                Email
              </label>
              <input
                id="oublie-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
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
              {charge ? "Envoi en cours..." : "Réinitialiser mon mot de passe"}
            </button>

            <p className="text-center text-sm text-encre/70">
              <Link
                href="/connexion"
                className="font-medium text-violet hover:underline"
              >
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}