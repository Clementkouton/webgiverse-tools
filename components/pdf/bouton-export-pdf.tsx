"use client";

import { useState } from "react";

export type OutilExport = {
  nom: string;
  description: string;
  tarif: string;
  slug: string;
  gratuit?: boolean;
};

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
      let y = 0;

      // Bandeau d'en-tête violet
      doc.setFillColor(109, 40, 217);
      doc.rect(0, 0, 595, 90, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(titre, marge, 45);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(
        sousTitre ?? "Sélection réalisée sur Webgiverse Outils IA",
        marge,
        65
      );

      y = 125;
      doc.setTextColor(30, 30, 30);

      outils.forEach((o, i) => {
        if (y + 80 > 780) {
          doc.addPage();
          y = 60;
        }

        // Nom de l'outil
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const lignesNom = doc.splitTextToSize(`${i + 1}. ${o.nom}`, largeurUtile);
        doc.text(lignesNom, marge, y);
        y += lignesNom.length * 16 + 2;

        // Tarif
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        const meta = [o.gratuit ? "Gratuit" : null, o.tarif || null]
          .filter(Boolean)
          .join(" · ");
        if (meta) {
          doc.text(meta, marge, y);
          y += 14;
        }

        // Description
        doc.setTextColor(60, 60, 60);
        const lignesDesc = doc.splitTextToSize(o.description || "", largeurUtile);
        doc.text(lignesDesc, marge, y);
        y += lignesDesc.length * 13 + 4;

        // Lien
        const lien = `${origine}/outil/${o.slug}`;
        doc.setTextColor(109, 40, 217);
        doc.textWithLink(lien, marge, y, { url: lien });
        y += 18;

        // Séparateur
        doc.setDrawColor(230, 230, 230);
        doc.line(marge, y - 8, 595 - marge, y - 8);
        y += 14;
        doc.setTextColor(30, 30, 30);
      });

      // Pied de page
      if (y + 40 > 780) {
        doc.addPage();
        y = 60;
      }
      doc.setFontSize(10);
      doc.setTextColor(130, 130, 130);
      doc.text("Généré avec Webgiverse Outils IA — " + origine, marge, y + 20);

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
      className="inline-flex items-center gap-2 rounded-champ border border-bordure bg-white px-4 py-2 text-sm font-medium text-encre transition hover:border-violet hover:text-violet disabled:opacity-60"
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
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
      {charge ? "Préparation..." : libelle}
    </button>
  );
}