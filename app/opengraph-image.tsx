// app/opengraph-image.tsx
// Image de partage social PAR DÉFAUT du site : utilisée par l'accueil,
// la FAQ, À propos… pour toutes les pages qui n'ont pas leur propre image.
import { ImageResponse } from "next/og";

export const alt = "Webgiverse Outils IA — l'annuaire francophone des outils IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0b1b3f",
          background: "linear-gradient(135deg, #0b1b3f 0%, #171a52 70%, #2c1f6e 100%)",
          padding: 80,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Ligne du haut : marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "linear-gradient(100deg, #00d1ff, #6a3bff 62%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.9 }}>
            Webgiverse Outils IA
          </div>
        </div>

        {/* Bloc central : promesse */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, maxWidth: 1020 }}>
            Trouve le bon outil IA pour ton projet
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.45, opacity: 0.85, maxWidth: 960 }}>
            L'annuaire francophone des outils IA, testés et expliqués simplement.
          </div>
        </div>

        {/* Ligne du bas : barre de marque + slogan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              width: 160,
              height: 8,
              borderRadius: 4,
              background: "linear-gradient(100deg, #00d1ff, #6a3bff 62%)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, opacity: 0.75 }}>
            <div>Apprendre · Créer · Réussir</div>
            <div>100 % en français, sans jargon</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}