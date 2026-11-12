// components/ui/bouton.tsx
// ─────────────────────────────────────────────────────────────────
// LOT 69 — BOUTON DE MARQUE, d'après le visuel « Tools » fourni :
//
//   1. Variante « primaire » : nouveau dégradé de marque mesuré sur
//      ton image (du bleu azur au violet-magenta) :
//        #027bfd → #0344fc → #301ff8 → #5e06f1 → #a203fc
//      (l'ancien dégradé #00d1ff → #6a3bff est remplacé partout où
//      la variante primaire est utilisée — même forme, même arrondi,
//      mêmes ombres douces recolorées en violet profond).
//
//   2. Nouveau composant LignesBouton : les 3 « lignes de vitesse »
//      blanches du logo, à placer AU DÉBUT du contenu d'un bouton :
//
//        <Bouton>
//          <LignesBouton /> Texte du bouton
//        </Bouton>
//
//        <Bouton asChild>
//          <Link href="/exemple">
//            <LignesBouton /> Texte du lien
//          </Link>
//        </Bouton>
//
//      IMPORTANT (cas asChild) : mets <LignesBouton /> DANS le <Link>
//      : le Slot de Radix attend un seul enfant.
//
// Les autres variantes (secondaire, fantôme, sombre, danger, indigo,
// indigoDoux) sont strictement inchangées.
// ─────────────────────────────────────────────────────────────────
"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const boutonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[14px] leading-5 font-semibold transition duration-200 active:scale-[0.98] active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variante: {
        primaire:
          "bg-[linear-gradient(100deg,#027bfd,#0344fc_25%,#301ff8_50%,#5e06f1_72%,#a203fc)] text-white shadow-[0_2px_12px_rgba(94,6,241,0.28)] hover:brightness-110 hover:shadow-[0_4px_18px_rgba(94,6,241,0.38)] active:brightness-95",
        secondaire:
          "border border-sky-500 bg-white text-bleu hover:border-sky-500-clair hover:bg-gris",
        fantome: "text-bleu hover:bg-white/70",
        sombre: "border border-white/25 bg-white/10 text-white hover:bg-white/20",
        danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
        /* Console admin « TailwindAdmin » — indigo plein, SANS dégradé */
        indigo: "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)] hover:bg-primaire-fonce",
        indigoDoux: "border border-primaire/30 bg-primaire/10 text-primaire-texte hover:border-primaire/60 hover:bg-primaire/15",
      },
      taille: {
        sm: "min-h-10 px-2 text-[14px] leading-5", // 44 px minimum (tactile)
        md: "min-h-11 px-6",
        lg: "min-h-12 px-8",
      },
    },
    defaultVariants: { variante: "primaire", taille: "md" },
  }
);

export function Bouton({
  className, variante, taille, asChild = false, ...props
}: React.ComponentProps<"button"> & VariantProps<typeof boutonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(boutonVariants({ variante, taille }), className)} {...props} />;
}

/* ── LOT 69 : les 3 « lignes de vitesse » du bouton de marque ──────
   Barres blanches empilées, longueurs différentes (haut 14 px,
   milieu 20 px, bas 9 px), alignées à droite comme sur le logo.
   Utilisation : <LignesBouton /> au début du contenu d'un bouton. */
export function LignesBouton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 flex-col items-end gap-[3px] ${className}`}
    >
      <span className="h-[2px] w-[14px] rounded-full bg-white/95" />
      <span className="h-[2px] w-[20px] rounded-full bg-white/95" />
      <span className="h-[2px] w-[9px] rounded-full bg-white/95" />
    </span>
  );
}