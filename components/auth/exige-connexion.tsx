"use client";

import FormulaireConnexion from "@/components/auth/formulaire-connexion";

type Props = {
  suite: string;
  titre?: string;
  message?: string;
};

export default function ExigeConnexion({ suite, titre, message }: Props) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
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
          <h1 className="font-titre text-h2 text-encre">
            {titre ?? "Espace réservé aux membres"}
          </h1>
          <p className="mt-2 text-sm text-encre/70">
            {message ??
              "Connectez-vous d'abord pour accéder à cette page. Vous n'avez pas encore de compte ? L'inscription est gratuite."}
          </p>
        </div>

        <FormulaireConnexion suite={suite} />
      </div>
    </div>
  );
}