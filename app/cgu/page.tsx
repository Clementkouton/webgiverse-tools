import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-h2 font-semibold">Page en cours de rÃ©daction</h1>
      <p className="mt-2 text-encre">Contenu Ã  venir.</p>
    </div>
  );
}
