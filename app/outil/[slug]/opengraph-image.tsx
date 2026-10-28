// app/outil/[slug]/opengraph-image.tsx
// Image de partage social générée automatiquement pour CHAQUE outil :
// quand tu partages le lien d'une fiche sur WhatsApp, LinkedIn, Facebook…,
// c'est cette carte 1200x630 qui s'affiche avec le nom de l'outil.
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "Fiche outil IA — Webgiverse";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600; // même durée de cache que la fiche

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const outil = await prisma.tool.findUnique({
    where: { slug },
    select: { nom: true, description: true, type: true, gratuit: true, openSource: true },
  });

  const nom = outil?.nom ?? "Outil IA";
  const descriptionBrute = outil?.description ?? "Découvrez cet outil sur l'annuaire francophone des outils IA.";
  const description = descriptionBrute.length > 150
    ? descriptionBrute.slice(0, 150) + "…"
    : descriptionBrute;

  const badges = [
    outil?.type === "AGENT" ? "Agent IA" : "Outil IA",
    ...(outil?.gratuit ? ["Gratuit"] : []),
    ...(outil?.openSource ? ["Open source"] : []),
  ];

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
          padding: 72,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Ligne du haut : marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "linear-gradient(100deg, #00d1ff, #6a3bff 62%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.9 }}>
            Webgiverse Outils IA
          </div>
        </div>

        {/* Bloc central */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {badges.map((b) => (
              <div
                key={b}
                style={{
                  paddingTop: 8,
                  paddingBottom: 8,
                  paddingLeft: 22,
                  paddingRight: 22,
                  borderRadius: 999,
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {b}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.05 }}>
            {nom}
          </div>
          <div style={{ fontSize: 31, lineHeight: 1.45, opacity: 0.85, maxWidth: 1020 }}>
            {description}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 25, opacity: 0.75 }}>
            <div>Apprendre · Créer · Réussir</div>
            <div>L'annuaire francophone des outils IA</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}