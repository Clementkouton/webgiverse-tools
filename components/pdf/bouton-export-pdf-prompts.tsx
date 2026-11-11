"use client";

// ─────────────────────────────────────────────────────────────────
// Bouton « Exporter mes prompts en PDF » — génération locale avec
// jsPDF. Lot 62 — NOUVEAU composant, même charte que l'export des
// listes (bandeau dégradé, cartes, pied de page paginé).
//   • un encadré par prompt : pastille violette + titre + catégorie,
//     description, modèles conseillés, conseil d'usage, puis le
//     CONTENU du prompt dans un bloc gris clair (multi-pages si le
//     prompt est long) ;
//   • le contenu n'est passé au PDF QUE si l'utilisateur est Premium
//     (cohérent avec le paywall du site) ; sinon une note le précise ;
//   • pas d'emoji dans le PDF (police helvetica) : pastille avec
//     l'initiale du titre à la place.
// Le PDF se TÉLÉCHARGE automatiquement (doc.save).
// ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import type { jsPDF } from "jspdf";

export type PromptExport = {
  titre: string;
  slug?: string;
  categorie?: string;
  description?: string;
  contenu?: string | null; // fourni uniquement si Premium
  modeles?: string[]; // ex. ["ChatGPT", "Claude"]
  conseils?: string | null;
};

// Dégradé de marque Webgiverse
const DEGRAD_A: [number, number, number] = [0, 209, 255]; // #00d1ff
const DEGRAD_B: [number, number, number] = [106, 59, 255]; // #6a3bff

function couleurInterpolee(t: number): [number, number, number] {
  return [
    Math.round(DEGRAD_A[0] + (DEGRAD_B[0] - DEGRAD_A[0]) * t),
    Math.round(DEGRAD_A[1] + (DEGRAD_B[1] - DEGRAD_A[1]) * t),
    Math.round(DEGRAD_A[2] + (DEGRAD_B[2] - DEGRAD_A[2]) * t),
  ];
}

function dessinerBandeau(doc: jsPDF, sousTitre: string, nombre: number) {
  const bandes = 80;
  for (let b = 0; b < bandes; b++) {
    const [r, g, bl] = couleurInterpolee(b / (bandes - 1));
    doc.setFillColor(r, g, bl);
    doc.rect((595 / bandes) * b - 0.5, 0, 595 / bandes + 1, 96, "F");
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Mes prompts sauvegardés", 50, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(238, 250, 255);
  doc.text(doc.splitTextToSize(sousTitre, 355).slice(0, 2), 50, 66);
  doc.setFontSize(9);
  doc.setTextColor(226, 244, 255);
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
    595 - 50,
    26,
    { align: "right" }
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${nombre} prompt${nombre > 1 ? "s" : ""}`, 595 - 50, 46, {
    align: "right",
  });
}

export default function BoutonExportPdfPrompts({
  prompts,
  libelle = "Exporter mes prompts en PDF",
  fichier = "mes-prompts-webgiverse",
}: {
  prompts: PromptExport[];
  libelle?: string;
  fichier?: string;
}) {
  const [charge, setCharge] = useState(false);

  async function exporter() {
    if (charge || prompts.length === 0) return;
    setCharge(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const marge = 50;
      const largeurUtile = 595 - marge * 2;
      const origine = window.location.origin;

      dessinerBandeau(
        doc,
        "Bibliothèque de prompts IA Webgiverse — à garder sous la main",
        prompts.length
      );

      let y = 128;

      prompts.forEach((p, i) => {
        // ── mesures AVANT de dessiner (pagination propre) ─────────
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const lignesTitre = doc.splitTextToSize(
          `${i + 1}. ${p.titre}`,
          largeurUtile - 60
        );
        const categorie = p.categorie || null;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const lignesCat = categorie ? doc.splitTextToSize(categorie, largeurUtile - 60) : [];
        doc.setFontSize(10);
        const lignesDesc = p.description
          ? doc.splitTextToSize(p.description, largeurUtile - 24)
          : [];
        const modelesTxt =
          p.modeles && p.modeles.length > 0
            ? `Modèles conseillés : ${p.modeles.join(", ")}`
            : null;
        const lignesModeles = modelesTxt
          ? doc.splitTextToSize(modelesTxt, largeurUtile - 24)
          : [];
        const lignesConseils =
          p.conseils && p.conseils.trim()
            ? doc.splitTextToSize(`Conseil : ${p.conseils.trim()}`, largeurUtile - 24)
            : [];

        const padH = 12;
        const zoneTitreH = Math.max(
          36,
          lignesTitre.length * 16 + (lignesCat.length ? lignesCat.length * 12 + 2 : 0) + 6
        );
        const descH = lignesDesc.length * 13 + (lignesDesc.length ? 6 : 0);
        const modelesH = lignesModeles.length * 12 + (lignesModeles.length ? 6 : 0);
        const conseilsH = lignesConseils.length * 12 + (lignesConseils.length ? 6 : 0);
        const contenuTxt = p.contenu && p.contenu.trim() ? p.contenu.trim() : null;
        const lignesContenu = contenuTxt
          ? doc.splitTextToSize(contenuTxt, largeurUtile - 24)
          : [];
        const noteH = contenuTxt ? 0 : 16;

        // hauteur totale estimée de la carte (hors multi-page du contenu)
        const hCarte =
          padH +
          zoneTitreH +
          descH +
          modelesH +
          conseilsH +
          noteH +
          (lignesContenu.length ? lignesContenu.length * 12 + 20 : 0) +
          padH;

        if (y + Math.min(hCarte, 690) > 782) {
          doc.addPage();
          y = 56;
        }

        // ── pastille violette (initiale du titre, pas d'emoji en PDF)
        const xLogo = marge + 2;
        const yLogo = y + padH;
        doc.setFillColor(DEGRAD_B[0], DEGRAD_B[1], DEGRAD_B[2]);
        doc.roundedRect(xLogo, yLogo, 30, 30, 7, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(
          (p.titre.replace(/[^\p{L}\p{N}]/gu, "").charAt(0) || "?").toUpperCase(),
          xLogo + 15,
          yLogo + 20,
          { align: "center" }
        );

        // ── titre + catégorie
        const xTexte = xLogo + 42;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(25, 28, 34);
        doc.text(lignesTitre, xTexte, y + padH + 12);
        let yCur = y + padH + lignesTitre.length * 16;
        if (lignesCat.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(DEGRAD_B[0], DEGRAD_B[1], DEGRAD_B[2]);
          doc.text(lignesCat, xTexte, yCur + 2);
          yCur += lignesCat.length * 12;
        }

        // ── description
        let ySuivant = Math.max(yCur + 6, yLogo + 36 + 8);
        if (lignesDesc.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(60, 65, 75);
          doc.text(lignesDesc, marge + 2, ySuivant);
          ySuivant += descH;
        }

        // ── modèles conseillés
        if (lignesModeles.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(90, 96, 108);
          doc.text(lignesModeles, marge + 2, ySuivant);
          ySuivant += modelesH;
        }

        // ── conseil d'usage (italique)
        if (lignesConseils.length) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9.5);
          doc.setTextColor(150, 110, 30);
          doc.text(lignesConseils, marge + 2, ySuivant);
          ySuivant += conseilsH;
        }

        // ── contenu : bloc gris multi-pages, ou note Premium
        if (lignesContenu.length) {
          const maxLignesParPage = Math.floor((782 - 70) / 12);
          let idx = 0;
          while (idx < lignesContenu.length) {
            const tranche = lignesContenu.slice(idx, idx + maxLignesParPage);
            const hBloc = tranche.length * 12 + 18;
            if (ySuivant + hBloc > 782) {
              doc.addPage();
              ySuivant = 56;
            }
            doc.setFillColor(248, 249, 251);
            doc.setDrawColor(233, 236, 241);
            doc.roundedRect(marge - 6, ySuivant, largeurUtile + 12, hBloc, 8, 8, "FD");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(45, 50, 60);
            doc.text(tranche, marge + 6, ySuivant + 15);
            ySuivant += hBloc + 8;
            idx += tranche.length;
          }
        } else {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(140, 145, 155);
          doc.text(
            "Le contenu complet du prompt est réservé au plan Premium.",
            marge + 2,
            ySuivant + 4
          );
          ySuivant += noteH;
        }

        y = ySuivant + 10;
      });

      // ── pied de page paginé (toutes les pages)
      const total = doc.getNumberOfPages();
      for (let pg = 1; pg <= total; pg++) {
        doc.setPage(pg);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 155, 165);
        doc.text("Généré avec Webgiverse Outils IA — " + origine, marge, 820);
        doc.text(`${pg} / ${total}`, 595 - marge, 820, { align: "right" });
      }

      doc.save(`${fichier}.pdf`);
    } finally {
      setCharge(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exporter}
      disabled={charge || prompts.length === 0}
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