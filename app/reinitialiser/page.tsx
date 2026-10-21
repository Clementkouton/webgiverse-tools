"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PageReinitialiser() {
  const [token, setToken] = useState("");
  const [courriel, setCourriel] = useState("");
  const [pret, setPret] = useState(false);

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
    setCourriel(params.get("email") ?? "");
    setPret(true);
  }, []);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setErreur(null);
    setCharge(true);

    try {
      const res = await fetch("/api/reinitialiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: courriel, motDePasse }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErreur(data?.erreur ?? "Une erreur est survenue. Réessayez.");
        setCharge(false);
        return;
      }

      setSucces(true);
    } catch {
      setErreur("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setCharge(false);
    }
  }

  if (pret && (!token || !courriel)) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <div className="rounded-carte border border-bordure bg-white p-6 text-center shadow-carte sm:p-8">
          <h1 className="font-titre text-h2 text-encre">Lien invalide</h1>
          <p className="mt-2 text-sm text-encre/70">
            Ce lien de réinitialisation est incomplet ou invalide.
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="mt-6 inline-block rounded-champ bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Refaire une demande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
        {succes ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
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
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="font-titre text-h2 text-encre">
              Mot de passe modifié
            </h1>
            <p className="text-sm text-encre/70">
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez
              maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <Link
              href="/connexion"
              className="inline-block rounded-champ bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="font-titre text-h2 text-encre">
                Nouveau mot de passe
              </h1>
              <p className="mt-2 text-sm text-encre/70">
                Choisissez un nouveau mot de passe pour votre compte.
              </p>
            </div>

            <form onSubmit={soumettre} className="space-y-4">
              <div>
                <label
                  htmlFor="reinit-mdp"
                  className="mb-1 block text-sm font-medium text-encre"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="reinit-mdp"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="w-full rounded-champ border border-bordure bg-gris px-3 py-2 text-sm text-encre outline-none transition focus:border-violet focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="reinit-confirmation"
                  className="mb-1 block text-sm font-medium text-encre"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="reinit-confirmation"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Ressaisissez le mot de passe"
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
                {charge ? "Enregistrement..." : "Enregistrer le mot de passe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}