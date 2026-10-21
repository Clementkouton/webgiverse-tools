// components/ui/carte.tsx
import { cn } from "@/lib/utils";

export function Carte({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-carte border border-bordure bg-white shadow-carte", className)} {...props} />;
}