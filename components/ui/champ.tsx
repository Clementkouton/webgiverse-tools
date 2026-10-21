// components/ui/champ.tsx  (input, textarea, label)
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-champ border border-bordure bg-white px-4 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none";

export function Champ({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(base, "min-h-11 text-[16px] leading-6", className)} {...props} />;
}

export function ZoneTexte({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(base, "py-3 text-[16px] leading-6", className)} {...props} />;
}

export function Etiquette({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-[14px] leading-5 font-medium text-bleu", className)} {...props} />;
}