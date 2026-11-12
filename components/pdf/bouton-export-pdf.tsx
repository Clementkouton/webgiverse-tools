"use client";

// ─────────────────────────────────────────────────────────────────
// Bouton « Exporter en PDF » — génération locale avec jsPDF.
// Lot 63 — version corrigée et finalisée (remplace le lot 62) :
//   • FIX CHEVAUCHEMENT : le lot 62 dessinait la ligne de tarif 5 pt
//     sous le titre → les textes se superposaient. L'espacement est
//     recalculé proprement (titre, puis pastille de tarif en dessous) ;
//   • VRAIS LOGOS : les logos externes sont chargés via le proxy
//     /api/logo (même origine) — le navigateur peut enfin lire leurs
//     pixels, le canvas ne tache plus, jsPDF dessine le vrai logo.
//     Essais successifs : proxy → URL directe → initiales en dégradé ;
//   • DESIGN : bandeau de marque avec le LOGO DE LA LISTE, carte par
//     outil avec logo encadré, pastille de tarif colorée (vert =
//     gratuit, violet = payant, gris = à vérifier), statut, note
//     personnelle, ligne « Voir la fiche » + lien cliquable ;
//   • pagination et pied de page conservés.
// Le PDF se TÉLÉCHARGE automatiquement (doc.save).
// Signature rétrocompatible : mêmes props + logoMarque (facultatif).
// Aucun emoji dans le PDF (police helvetica) : caractères sûrs uniquement.
// ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import type { jsPDF } from "jspdf";

export type OutilExport = {
  nom: string;
  description: string;
  tarif: string;
  slug: string;
  gratuit?: boolean;
  logo?: string | null; // URL du logo (externe ou relatif)
  note?: string | null; // note personnelle (favoris du dashboard)
  statut?: string; // A_TESTER | EN_COURS | ADOPTE (favoris du dashboard)
};

const LIBELLES_STATUT: Record<string, string> = {
  A_TESTER: "À tester",
  EN_COURS: "En cours",
  ADOPTE: "Adopté",
};

// Palette de marque Webgiverse
const DEGRAD_A: [number, number, number] = [0, 209, 255]; // #00d1ff
const DEGRAD_B: [number, number, number] = [106, 59, 255]; // #6a3bff
const ENCRE: [number, number, number] = [25, 28, 34]; // #191c22
const GRIS_TEXTE: [number, number, number] = [60, 65, 75]; // #3c414b
const GRIS_DOUX: [number, number, number] = [110, 116, 125]; // #6e747d
const FOND_CARTE: [number, number, number] = [250, 251, 253];
const BORD_CARTE: [number, number, number] = [233, 236, 241];

const PAGE_L = 595; // A4 en points
const MARGE = 50;
const BANDEAU_H = 112;
const LOGO_T = 44; // côté du logo d'outil dans une carte
const PAD_H = 14; // padding vertical intérieur d'une carte

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

// ── Chargement d'une image → dataURL PNG (canvas 96 × 96, fond blanc)
function chargerImage(src: string, delaiMs: number): Promise<string | null> {
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
        if (!img.naturalWidth || !img.naturalHeight) {
          clearTimeout(minuteur);
          return finir(null); // SVG sans dimensions → échec propre
        }
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
        const l = img.naturalWidth;
        const h = img.naturalHeight;
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
    img.src = src;
  });
}

// Lot 63 — essaie le PROXY d'abord (même origine → canvas lisible),
// puis l'URL directe (si le site autorise CORS), sinon null.
async function logoVersDataUrl(url: string, origine: string): Promise<string | null> {
  const candidats: string[] = [];
  if (url.startsWith("/")) {
    // Logo hébergé sur le site lui-même : directement utilisable.
    candidats.push(origine + url);
  } else {
    candidats.push(`${origine}/api/logo?u=${encodeURIComponent(url)}`);
    if (url.startsWith("https://")) candidats.push(url);
  }
  for (const src of candidats) {
    const dataUrl = await chargerImage(src, 4500);
    if (dataUrl) return dataUrl;
  }
  return null;
}

// Carré dégradé + initiales (fallback impeccable)
function dessinerPastilleInitiales(
  doc: jsPDF,
  nom: string,
  x: number,
  y: number,
  taille: number
) {
  doc.setFillColor(DEGRAD_B[0], DEGRAD_B[1], DEGRAD_B[2]);
  doc.roundedRect(x, y, taille, taille, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(taille >= 40 ? 13 : 11);
  doc.text(initialesDe(nom), x + taille / 2, y + taille / 2 + 4, { align: "center" });
}

// ── Pastille de tarif (couleur selon gratuité) ────────────────────
type Pill = { texte: string; fond: [number, number, number]; encre: [number, number, number] };

function pillPourOutil(o: OutilExport): Pill {
  if (o.gratuit) {
    return { texte: "Gratuit", fond: [228, 245, 236], encre: [10, 122, 66] };
  }
  // « Payant — montant non renseigné par la source » → « Payant » :
  // on coupe au premier « — » pour une pastille courte et lisible.
  let t = (o.tarif || "").trim().replace(/^—\s*/, "");
  if (t.includes(" — ")) t = t.split(" — ")[0].trim();
  if (!t || /^à vérifier/i.test(t)) {
    return { texte: "À vérifier", fond: [240, 242, 245], encre: [91, 100, 114] };
  }
  const texte = t.length > 30 ? `${t.slice(0, 29)}…` : t;
  return { texte, fond: [239, 234, 255], encre: [86, 48, 214] };
}

function dessinerPill(doc: jsPDF, pill: Pill, x: number, yHaut: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const largeur = doc.getTextWidth(pill.texte) + 16;
  doc.setFillColor(pill.fond[0], pill.fond[1], pill.fond[2]);
  doc.roundedRect(x, yHaut, largeur, 15, 7.5, 7.5, "F");
  doc.setTextColor(pill.encre[0], pill.encre[1], pill.encre[2]);
  doc.text(pill.texte, x + 8, yHaut + 10.5);
  return largeur;
}

export default function BoutonExportPdf({
  titre,
  sousTitre,
  outils,
  libelle = "Télécharger en PDF",
  fichier = "webgiverse-outils",
  logoMarque = null,
}: {
  titre: string;
  sousTitre?: string;
  outils: OutilExport[];
  libelle?: string;
  fichier?: string;
  /** Lot 63 — logo de la liste (page Entreprise) affiché dans le bandeau. */
  logoMarque?: string | null;
}) {
  const [charge, setCharge] = useState(false);

  async function exporter() {
    if (charge || outils.length === 0) return;
    setCharge(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const origine = window.location.origin;

      // 1) Logos chargés en parallèle AVANT de dessiner (proxy → direct)
      const [logos, logoBandeau] = await Promise.all([
        Promise.all(
          outils.map((o) => (o.logo ? logoVersDataUrl(o.logo, origine) : Promise.resolve(null)))
        ),
        logoMarque ? logoVersDataUrl(logoMarque, origine) : Promise.resolve(null),
      ]);

      // 2) Bandeau dégradé de marque (page 1)
      const bandes = 80;
      for (let b = 0; b < bandes; b++) {
        const [r, g, bl] = couleurInterpolee(b / (bandes - 1));
        doc.setFillColor(r, g, bl);
        doc.rect((PAGE_L / bandes) * b - 0.5, 0, PAGE_L / bandes + 1, BANDEAU_H, "F");
      }

      // Logo de la liste dans le bandeau (cadre blanc arrondi)
      let xTexte = MARGE;
      if (logoBandeau) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(MARGE - 6, 26, 60, 60, 12, 12, "F");
        try {
          doc.addImage(logoBandeau, "PNG", MARGE - 2, 30, 52, 52);
        } catch {
          /* image refusée : le cadre blanc reste sobre */
        }
        xTexte = MARGE + 62;
      }

      const largeurTitre = PAGE_L - MARGE - xTexte - 120;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      const lignesTitre = doc.splitTextToSize(titre, largeurTitre);
      doc.text(lignesTitre.slice(0, 2), xTexte, 48);
      const finTitre = 48 + (Math.min(lignesTitre.length, 2) - 1) * 20;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(238, 250, 255);
      const sous = sousTitre ?? "Sélection réalisée sur Webgiverse Outils IA";
      doc.text(doc.splitTextToSize(sous, largeurTitre).slice(0, 2), xTexte, finTitre + 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(226, 244, 255);
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, PAGE_L - MARGE, 30, {
        align: "right",
      });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(`${outils.length} outil${outils.length > 1 ? "s" : ""}`, PAGE_L - MARGE, 52, {
        align: "right",
      });

      // 3) Une carte par outil
      let y = BANDEAU_H + 26;

      outils.forEach((o, i) => {
        // ── MESURES AVANT DE DESSINER (pagination propre) ──────────
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const lignesNom = doc.splitTextToSize(`${i + 1}. ${o.nom}`, PAGE_L - 2 * MARGE - 76);

        const pill = pillPourOutil(o);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        const lPill = doc.getTextWidth(pill.texte) + 16;

        const statutTxt = o.statut ? LIBELLES_STATUT[o.statut] ?? o.statut : null;
        let largStatut = 0;
        if (statutTxt) largStatut = doc.getTextWidth(statutTxt);
        const xTexteCarte = MARGE + 2 + LOGO_T + 14;
        // Le statut tient à droite de la pastille ? sinon il passe dessous.
        const statutSurLigne =
          statutTxt !== null &&
          xTexteCarte + lPill + 10 + largStatut <= PAGE_L - MARGE;

        const zoneDroiteH =
          lignesNom.length * 16 + 8 + 15 + (statutTxt && !statutSurLigne ? 14 : 0);
        const zoneTitreH = Math.max(LOGO_T + 6, zoneDroiteH);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lignesDesc = doc.splitTextToSize(o.description || "", PAGE_L - 2 * MARGE - 28);
        const descH = lignesDesc.length ? lignesDesc.length * 13 + 8 : 0;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        const lignesNote =
          o.note && o.note.trim()
            ? doc.splitTextToSize(`Ma note : ${o.note.trim()}`, PAGE_L - 2 * MARGE - 28)
            : [];
        const noteH = lignesNote.length ? lignesNote.length * 12 + 6 : 0;

        // Lien de la fiche (affiché tronqué, cliquable en entier)
        const lien = `${origine}/outil/${o.slug}`;
        const etiquette = "Voir la fiche »";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        let urlVisible = lien.replace(/^https?:\/\//, "");
        const largeurUrlMax = PAGE_L - 2 * MARGE - doc.getTextWidth(etiquette) - 34;
        while (doc.getTextWidth(urlVisible) > largeurUrlMax && urlVisible.length > 8) {
          urlVisible = urlVisible.slice(0, -2);
        }
        if (`${urlVisible}…` !== lien.replace(/^https?:\/\//, "")) urlVisible += "…";

        const lienH = 22;
        const hCarte = PAD_H + zoneTitreH + descH + noteH + lienH + PAD_H;

        if (y + hCarte > 800) {
          doc.addPage();
          y = 56;
        }

        // ── DESSIN ─────────────────────────────────────────────────
        // Fond de carte arrondi
        doc.setFillColor(FOND_CARTE[0], FOND_CARTE[1], FOND_CARTE[2]);
        doc.setDrawColor(BORD_CARTE[0], BORD_CARTE[1], BORD_CARTE[2]);
        doc.roundedRect(MARGE - 12, y, PAGE_L - 2 * MARGE + 24, hCarte, 12, 12, "FD");

        // Logo : cadre blanc + vrai logo, sinon initiales en dégradé
        const xLogo = MARGE + 2;
        const yLogo = y + PAD_H + 2;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(235, 238, 243);
        doc.roundedRect(xLogo - 2, yLogo - 2, LOGO_T + 4, LOGO_T + 4, 10, 10, "FD");
        if (logos[i]) {
          try {
            doc.addImage(logos[i]!, "PNG", xLogo, yLogo, LOGO_T, LOGO_T);
          } catch {
            dessinerPastilleInitiales(doc, o.nom, xLogo, yLogo, LOGO_T);
          }
        } else {
          dessinerPastilleInitiales(doc, o.nom, xLogo, yLogo, LOGO_T);
        }

        // Nom (FIX lot 62 : espacement correct sous le titre)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(ENCRE[0], ENCRE[1], ENCRE[2]);
        doc.text(lignesNom, xTexteCarte, y + PAD_H + 12);

        // Pastille de tarif SOUS le nom (au lieu de par-dessus)
        let yCur = y + PAD_H + 12 + (lignesNom.length - 1) * 16 + 6;
        const lPillDessinee = dessinerPill(doc, pill, xTexteCarte, yCur);
        if (statutTxt) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(GRIS_DOUX[0], GRIS_DOUX[1], GRIS_DOUX[2]);
          if (statutSurLigne) {
            doc.text(statutTxt, xTexteCarte + lPillDessinee + 10, yCur + 10.5);
          } else {
            doc.text(statutTxt, xTexteCarte, yCur + 15 + 9);
          }
        }

        // Description (pleine largeur, sous le logo)
        let ySuivant = y + PAD_H + zoneTitreH;
        if (lignesDesc.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(GRIS_TEXTE[0], GRIS_TEXTE[1], GRIS_TEXTE[2]);
          doc.text(lignesDesc, MARGE + 2, ySuivant + 9);
          ySuivant += descH;
        }

        // Note personnelle (italique ambre)
        if (lignesNote.length) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9.5);
          doc.setTextColor(150, 110, 30);
          doc.text(lignesNote, MARGE + 2, ySuivant + 8);
          ySuivant += noteH;
        }

        // Ligne « Voir la fiche » + URL visible, toute la zone cliquable
        const yLien = y + hCarte - 17;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(DEGRAD_B[0], DEGRAD_B[1], DEGRAD_B[2]);
        const lEtiquette = doc.getTextWidth(etiquette); // largeur mesurée en 9,5 gras
        doc.textWithLink(etiquette, MARGE + 2, yLien, { url: lien });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(GRIS_DOUX[0], GRIS_DOUX[1], GRIS_DOUX[2]);
        doc.text(urlVisible, MARGE + 2 + lEtiquette + 12, yLien);

        y += hCarte + 12;
      });

      // 4) Pied de page paginé (toutes les pages)
      const total = doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 155, 165);
        doc.text("Généré avec Webgiverse Outils IA — " + origine, MARGE, 820);
        doc.text(`${p} / ${total}`, PAGE_L - MARGE, 820, { align: "right" });
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
      disabled={charge || outils.length === 0}
      className="inline-flex min-h-11 items-center gap-2 rounded-[7px] -skew-x-[18deg] bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition duration-200 hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
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