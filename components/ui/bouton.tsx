// components/ui/bouton.tsx
"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const boutonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[16px] leading-5 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variante: {
        primaire:
          "bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] hover:brightness-110 hover:shadow-[0_4px_18px_rgba(106,59,255,0.38)] active:brightness-95",
        secondaire:
          "border border-violet bg-white text-bleu hover:border-violet-clair hover:bg-gris",
        fantome: "text-bleu hover:bg-white/70",
        sombre: "border border-white/25 bg-white/10 text-white hover:bg-white/20",
        danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
      },
      taille: {
        sm: "min-h-11 px-4 text-[14px] leading-5", // 44 px minimum (tactile)
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