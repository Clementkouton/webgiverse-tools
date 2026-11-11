"use client";

// ─────────────────────────────────────────────────────────────────
// Bouton « Exporter en PDF » — génération locale avec jsPDF.
// Lot 62 — version redessinée (design + LOGOS des outils) :
//   • bandeau dégradé de marque (#00d1ff → #6a3bff) avec titre,
//     sous-titre, date et compteur d'outils ;
//   • chaque outil présenté dans une CARTE arrondie avec son LOGO :
//     le logo est chargé via canvas (crossOrigin + délai 4 s) — si le
//     site d'origine refuse l'affichage externe, le PDF reste
//     impeccable : carré dégradé + initiales à la place ;
//   • note personnelle et statut (À tester / En cours / Adopté)
//     conservés quand ils sont fournis (onglet Favoris) ;
//   • lien cliquable vers la fiche + pied de page paginé.
// Le PDF se TÉLÉCHARGE automatiquement (doc.save) : il arrive dans le
// dossier Téléchargements du navigateur.
// Signature rétrocompatible : mêmes props + logo (facultatif).
// ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import type { jsPDF } from "jspdf";

export type OutilExport = {
  nom: string;
  description: string;
  tarif: string;
  slug: string;
  gratuit?: boolean;
  logo?: string | null; // Lot 62 — logo dessiné dans le PDF
  note?: string | null; // note personnelle (favoris du dashboard)
  statut?: string; // A_TESTER | EN_COURS | ADOPTE (favoris du dashboard)
};

const LIBELLES_STATUT: Record<string, string> = {
  A_TESTER: "À tester",
  EN_COURS: "En cours",
  ADOPTE: "Adopté",
};

// Dégradé de marque Webgiverse
const DEGRAD_A: [number, number, number] = [0, 209, 255]; // #00d1ff
const DEGRAD_B: [number, number, number] = [106, 59, 255]; // #6a3bff

function initialesDe(nom: string): string {
  return nom
    .split(/[\s:.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();
}

function couleurInterpolee(t: number): [number, number, number] {
  return [
    Math.round(DEGRAD_A[0] + (DEGRAD_B[0] - DEGRAD_A[0]) * t),
    Math.round(DEGRAD_A[1] + (DEGRAD_B[1] - DEGRAD_A[1]) * t),
    Math.round(DEGRAD_A[2] + (DEGRAD_B[2] - DEGRAD_A[2]) * t),
  ];
}

// Charge une image externe et la convertit en PNG dataURL utilisable
// par doc.addImage(). En cas d'échec (CORS, lien mort, délai dépassé)
// on renvoie null → le PDF dessine les initiales à la place.
function logoVersDataUrl(url: string, delaiMs = 4000): Promise<string | null> {
  return new Promise((resolve) => {
    let termine = false;
    const finir = (valeur: string | null) => {
      if (termine) return;
      termine = true;
      resolve(valeur);
    };
    const minuteur = setTimeout(() => finir(null), delaiMs);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cote = 96;
        const canvas = document.createElement("canvas");
        canvas.width = cote;
        canvas.height = cote;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          clearTimeout(minuteur);
          return finir(null);
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cote, cote);
        const l = img.naturalWidth || cote;
        const h = img.naturalHeight || cote;
        const ratio = Math.min(cote / l, cote / h);
        ctx.drawImage(img, (cote - l * ratio) / 2, (cote - h * ratio) / 2, l * ratio, h * ratio);
        clearTimeout(minuteur);
        finir(canvas.toDataURL("image/png"));
      } catch {
        clearTimeout(minuteur);
        finir(null);
      }
    };
    img.onerror = () => {
      clearTimeout(minuteur);
      finir(null);
    };
    img.src = url;
  });
}

// Carré dégradé + initiales, même esprit que LogoOutil sur le site.
function dessinerPastilleInitiales(doc: jsPDF, nom: string, x: number, y: number, taille: number) {
  doc.setFillColor(DEGRAD_B[0], DEGRAD_B[1], DEGRAD_B[2]);
  doc.roundedRect(x, y, taille, taille, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(taille >= 40 ? 13 : 11);
  doc.text(initialesDe(nom), x + taille / 2, y + taille / 2 + 4, { align: "center" });
}

export default function BoutonExportPdf({
  titre,
  sousTitre,
  outils,
  libelle = "Télécharger en PDF",
  fichier = "webgiverse-outils",
}: {
  titre: string;
  sousTitre?: string;
  outils: OutilExport[];
  libelle?: string;
  fichier?: string;
}) {
  const [charge, setCharge] = useState(false);

  async function exporter() {
    if (charge || outils.length === 0) return;
    setCharge(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const marge = 50;
      const largeurUtile = 595 - marge * 2;
      const origine = window.location.origin;

      // 1) Logos chargés en parallèle avant de dessiner (4 s max chacun)
      const logos = await Promise.all(
        outils.map((o) => (o.logo ? logoVersDataUrl(o.logo) : Promise.resolve(null)))
      );

      // 2) Bandeau dégradé de marque (page 1)
      const bandes = 80;
      for (let b = 0; b < bandes; b++) {
        const [r, g, bl] = couleurInterpolee(b / (bandes - 1));
        doc.setFillColor(r, g, bl);
        doc.rect((595 / bandes) * b - 0.5, 0, 595 / bandes + 1, 96, "F");
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      const lignesTitre = doc.splitTextToSize(titre, largeurUtile - 140);
      doc.text(lignesTitre.slice(0, 2), marge, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(238, 250, 255);
      const sous =
        sousTitre ?? "Sélection réalisée sur Webgiverse Outils IA";
      doc.text(doc.splitTextToSize(sous, largeurUtile - 140).slice(0, 2), marge, 66);
      doc.setFontSize(9);
      doc.setTextColor(226, 244, 255);
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
        595 - marge,
        26,
        { align: "right" }
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `${outils.length} outil${outils.length > 1 ? "s" : ""}`,
        595 - marge,
        46,
        { align: "right" }
      );

      // 3) Une carte par outil (logo + nom + méta + description + note + lien)
      let y = 128;
      outils.forEach((o, i) => {
        // — mesures AVANT de dessiner (pour la pagination propre)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const lignesNom = doc.splitTextToSize(`${i + 1}. ${o.nom}`, largeurUtile - 72);
        const meta = [
          o.gratuit ? "Version gratuite" : null,
          o.tarif || null,
          o.statut ? LIBELLES_STATUT[o.statut] ?? null : null,
        ]
          .filter(Boolean)
          .join(" · ");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const lignesMeta = meta ? doc.splitTextToSize(meta, largeurUtile - 72) : [];
        doc.setFontSize(10);
        const lignesDesc = doc.splitTextToSize(o.description || "", largeurUtile - 24);
        const lignesNote =
          o.note && o.note.trim()
            ? doc.splitTextToSize(`Ma note : ${o.note.trim()}`, largeurUtile - 24)
            : [];

        const padH = 12;
        const zoneTitreH = Math.max(
          44,
          lignesNom.length * 16 + (lignesMeta.length ? lignesMeta.length * 13 + 4 : 0) + 10
        );
        const descH = lignesDesc.length * 13 + 8;
        const noteH = lignesNote.length ? lignesNote.length * 13 + 4 : 0;
        const lienH = 16;
        const hCarte = padH + zoneTitreH + descH + noteH + lienH + padH;

        if (y + hCarte > 782) {
          doc.addPage();
          y = 56;
        }

        // — fond de carte arrondi
        doc.setFillColor(248, 249, 251);
        doc.setDrawColor(233, 236, 241);
        doc.roundedRect(marge - 10, y - 4, largeurUtile + 20, hCarte, 10, 10, "FD");

        // — logo (réel ou initiales)
        const xLogo = marge + 2;
        const yLogo = y + padH;
        if (logos[i]) {
          try {
            doc.addImage(logos[i]!, "PNG", xLogo, yLogo, 40, 40);
          } catch {
            dessinerPastilleInitiales(doc, o.nom, xLogo, yLogo, 40);
          }
        } else {
          dessinerPastilleInitiales(doc, o.nom, xLogo, yLogo, 40);
        }

        // — nom + méta, à droite du logo
        const xTexte = xLogo + 52;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(25, 28, 34);
        doc.text(lignesNom, xTexte, y + padH + 13);
        let yCur = y + padH + lignesNom.length * 16;
        if (lignesMeta.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(110, 116, 125);
          doc.text(lignesMeta, xTexte, yCur + 2);
          yCur += lignesMeta.length * 13;
        }

        // — description pleine largeur, sous le logo
        let ySuivant = Math.max(yCur + 8, yLogo + 44 + 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 65, 75);
        doc.text(lignesDesc, marge + 2, ySuivant);
        ySuivant += descH;

        // — note personnelle (italique)
        if (lignesNote.length) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9.5);
          doc.setTextColor(150, 110, 30);
          doc.text(lignesNote, marge + 2, ySuivant);
          ySuivant += noteH;
        }

        // — lien cliquable vers la fiche
        const lien = `${origine}/outil/${o.slug}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(DEGRAD_B[0], DEGRAD_B[1], DEGRAD_B[2]);
        doc.textWithLink(lien, marge + 2, ySuivant + 8, { url: lien });

        y += hCarte + 8;
      });

      // 4) Pied de page paginé (toutes les pages)
      const total = doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 155, 165);
        doc.text("Généré avec Webgiverse Outils IA — " + origine, marge, 820);
        doc.text(`${p} / ${total}`, 595 - marge, 820, { align: "right" });
      }

      // TÉLÉCHARGEMENT : le fichier arrive dans le dossier Téléchargements
      doc.save(`${fichier}.pdf`);
    } finally {
      setCharge(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exporter}
      disabled={charge || outils.length === 0}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition duration-200 hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
      {charge ? "Préparation du PDF…" : libelle}
    </button>
  );
}