// components/ui/bouton.tsx
"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const boutonVariants = cva(
  "group relative inline-flex shrink-0 items-center justify-center rounded-[7px] -skew-x-[18deg] not-italic text-[14px] leading-5 font-semibold transition duration-200 active:scale-[0.98] active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
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
        indigo:
          "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)] hover:bg-primaire-fonce",
        indigoDoux:
          "border border-primaire/30 bg-primaire/10 text-primaire-texte hover:border-primaire/60 hover:bg-primaire/15",
      },
      taille: {
        sm: "min-h-10 px-4 text-[14px] leading-5",
        md: "min-h-11 px-7 text-[15px] leading-6",
        lg: "min-h-12 px-9 text-[16px] leading-7",
      },
    },
    defaultVariants: { variante: "primaire", taille: "md" },
  }
);

// Contre-rotation : redresse le contenu (texte + icônes)
const contenuDroit =
  "inline-flex items-center justify-center gap-2.5 not-italic skew-x-[18deg] [&_svg]:size-[18px] [&_svg]:shrink-0";

export function Bouton({
  className,
  variante,
  taille,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof boutonVariants> & { asChild?: boolean }) {
  const classes = cn(boutonVariants({ variante, taille }), className);

  // asChild (ex: <Link>) : on applique la forme sur l'enfant lui-même
  // et on enveloppe son contenu dans un <span> qui redresse le texte.
  if (asChild && React.isValidElement(children)) {
    const enfant = children as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;

    return React.cloneElement(
      enfant,
      {
        ...(props as object),
        className: cn(classes, enfant.props.className),
      } as React.HTMLAttributes<HTMLElement>,
      <span className={contenuDroit}>{enfant.props.children}</span>
    );
  }

  return (
    <button className={classes} {...props}>
      <span className={contenuDroit}>{children}</span>
    </button>
  );
}

/* ── Les 3 « lignes de vitesse » ───────────────────────────────── */
// Pas de skew ici : elles sont déjà dans le contenu redressé.
export function LignesBouton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 flex-col gap-[3.5px]", className)}
    >
      <span className="ml-auto h-[2.5px] w-[15px] rounded-[7px] bg-[#baf5ff]" />
      <span className="h-[2.5px] w-[19px] rounded-[7px] bg-[#baf5ff]" />
      <span className="mx-auto h-[2.5px] w-[10px] rounded-[7px] bg-[#baf5ff]" />
    </span>
  );
}