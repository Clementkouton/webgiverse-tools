// components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] leading-4 font-medium",
  {
    variants: {
      variante: {
        defaut: "border-bordure bg-gris text-bleu",
        gratuit: "border-transparent bg-turquoise text-bleu",
        nouveau: "border-transparent bg-neon text-bleu",
        source: "border-transparent bg-violet/10 text-violet",
        agent: "border-transparent bg-ciel/15 text-[#00648a]",
        magenta: "border-transparent bg-magenta text-white",
        sombre: "border-white/20 bg-white/10 text-white",
      },
    },
    defaultVariants: { variante: "defaut" },
  }
);

export function Badge({
  className, variante, ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variante }), className)} {...props} />;
}