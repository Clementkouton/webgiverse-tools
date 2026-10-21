// lib/dates.ts
const formateur = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** 2026-10-22T09:00:00Z → « 22 oct. 2026 » */
export function formatteDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formateur.format(d);
}