"use client";
// app/global-error.tsx
// ─────────────────────────────────────────────────────────────────
// Page d'erreur GLOBALE qui affiche la VRAIE erreur au lieu du
// message générique « une exception côté client s'est produite ».
// Objectif : voir immédiatement le message et la trace de l'erreur
// directement sur la page (plus besoin d'ouvrir la console F12),
// puis me l'envoyer en capture pour que je corrige précisément.
//
// ⚠️ Ce fichier remplace l'écran d'erreur par défaut de Next.js :
// il doit définir lui-même <html> et <body>, et les styles sont donc
// en ligne (le CSS du site n'est pas chargé sur cet écran).
// ─────────────────────────────────────────────────────────────────
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Trace complète dans la console aussi
    console.error(error);
  }, [error]);

  const message = error?.message || "(aucun message)";
  const trace = error?.stack || "(pas de trace disponible)";
  const digest = error?.digest;

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#f4f5f8",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "40px 16px",
          color: "#1f2430",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 860,
            background: "#ffffff",
            border: "1px solid #e3e6ee",
            borderRadius: 16,
            padding: "28px 28px 24px",
            boxShadow: "0 10px 30px rgba(20,30,60,0.08)",
          }}
        >
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              margin: 0,
              padding: "4px 12px",
              borderRadius: 999,
              background: "#fdeceb",
              color: "#c94f35",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            ERREUR DIAGNOSTIC — page de débogage
          </p>

          <h1
            style={{
              margin: "14px 0 4px",
              fontSize: 22,
              lineHeight: 1.3,
              fontWeight: 700,
            }}
          >
            L&apos;application a planté — voici la vraie erreur
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#5a6172" }}>
            Envoie-moi une capture de CET écran (tout, y compris le cadre
            gris ci-dessous) : je pourrai corriger précisément.
          </p>

          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              background: "#fdeceb",
              border: "1px solid #f3c4bc",
              borderRadius: 10,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#8a2f1d",
              fontWeight: 600,
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>

          {digest ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#5a6172" }}>
              Code d&apos;erreur (digest) :{" "}
              <code
                style={{
                  background: "#eef1f7",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                {digest}
              </code>
            </p>
          ) : null}

          <pre
            style={{
              marginTop: 16,
              maxHeight: 340,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#141822",
              color: "#d7e0f2",
              borderRadius: 10,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            {trace}
          </pre>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                cursor: "pointer",
                background: "#5d87ff",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 20px",
                borderRadius: 999,
              }}
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: "1px solid #c9cfdd",
                cursor: "pointer",
                background: "#fff",
                color: "#1f2430",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 20px",
                borderRadius: 999,
              }}
            >
              Recharger la page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
