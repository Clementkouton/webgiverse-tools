// components/ui/bouton.tsx
"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const boutonVariants = cva(
  // Le conteneur (bordure/fond) est un parallélogramme incliné vers la gauche (skew-x-[18deg])
  "group relative inline-flex shrink-0 items-center justify-center rounded-[7px] -skew-x-[18deg] text-[14px] leading-5 font-semibold transition duration-200 active:scale-[0.98] active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variante: {
        primaire:
          "bg-[linear-gradient(100deg,#027bfd,#0344fc_25%,#301ff8_50%,#5e06f1_72%,#a203fc)] text-white shadow-[0_2px_12px_rgba(94,6,241,0.28)] hover:brightness-110 hover:shadow-[0_4px_18px_rgba(94,6,241,0.38)] active:brightness-95 active:shadow-[0_2px_12px_rgba(94,6,241,0.28)] text-white",
        secondaire:
          "border border-sky-500 bg-white text-bleu hover:border-sky-500-clair hover:bg-gris hover:text-bleu-clair active:bg-gris-clair active:text-bleu-clair",
        fantome: "text-bleu hover:bg-white/70",
        sombre: "border border-white/25 bg-white/10 text-white hover:bg-white/20 active:bg-white/10",
        danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50 active:bg-red-100",
        indigo:
          "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)] hover:bg-primaire-fonce active:bg-primaire-fonce",
        indigoDoux:
          "border border-primaire/30 bg-primaire/10 text-primaire-texte hover:border-primaire/60 hover:bg-primaire/15 active:bg-primaire/10 ",
      },
      taille: {
        sm: "min-h-10 px-4 text-[14px] leading-5 ",
        md: "min-h-11 px-7 text-[15px] leading-6",
        lg: "min-h-12 px-9 text-[16px] leading-7",
      },
    },
    defaultVariants: { variante: "primaire", taille: "md" },
  }
);

export function Bouton({
  className,
  variante,
  taille,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof boutonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  // Si asChild est true (ex: <Link>), on applique la contre-inclinaison (-skew-x) sur l'enfant pour que le texte reste droit
  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;

    return (
      <Comp
        className={cn(boutonVariants({ variante, taille }), className)}
        {...props}
      >
        {React.cloneElement(childElement, {
          className: cn(
            "inline-flex items-center justify-center gap-2.5 -skew-x-[18deg] [&_svg]:size-[18px] [&_svg]:shrink-0",
            childElement.props.className
          ),
        })}
      </Comp>
    );
  }

  // Cas standard (<button>) : le texte est redressé via -skew-x-[18deg] pour ne pas être penché
  return (
    <Comp
      className={cn(boutonVariants({ variante, taille }), className)}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2.5 -skew-x-[18deg] [&_svg]:size-[18px] [&_svg]:shrink-0">
        {children}
      </span>
    </Comp>
  );
}

/* ── Les 3 « lignes de vitesse » ─────────────────────────────────── */
export function LignesBouton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 flex-col gap-[3.5px] *:[&>span]:rounded-[7px] -skew-x-[18deg] [&>span]:h-[2.5px] [&>span]:w-[15px]",
        className
      )}
    >
      <span className="ml-auto h-[2.5px] w-[15px] rounded-[7px] -skew-x-[18deg] bg-[#baf5ff]" />
      <span className="h-[2.5px] w-[19px] rounded-[7px] -skew-x-[18deg] bg-[#baf5ff]" />
      <span className="mx-auto h-[2.5px] w-[10px] rounded-[7px] -skew-x-[18deg] bg-[#baf5ff]" />
    </span>
  );
}