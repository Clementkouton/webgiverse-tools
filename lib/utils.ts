// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entrees: ClassValue[]) {
  return twMerge(clsx(entrees));
}

/** Retire les accents (recherche et scoring insensibles) */
export function deaccentuer(texte: string): string {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** « Le Chat (Mistral) » → « le-chat-mistral » */
export function slugifier(s: string): string {
  return deaccentuer(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}