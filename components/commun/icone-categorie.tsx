import { Bot, Briefcase, Clapperboard, Code2, Languages, ListChecks, Megaphone,
  MessageCircle, Mic, Palette, PenLine, Search, TrendingUp, Workflow, type LucideIcon } from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  MessageCircle, PenLine, Palette, Clapperboard, Mic, Code2, Megaphone,
  TrendingUp, Briefcase, ListChecks, Workflow, Languages, Search, Bot,
};

export function IconeCategorie({ nom, className }: { nom?: string | null; className?: string }) {
  const Icone = ICONES[nom ?? ""] ?? Bot;
  return <Icone className={className ?? "size-6 text-violet"} aria-hidden />;
}