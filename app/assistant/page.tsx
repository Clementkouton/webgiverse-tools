// app/assistant/page.tsx
import type { Metadata } from "next";
import { AssistantOnglets } from "@/components/assistant/assistant-client";

export const metadata: Metadata = {
  title: "Assistant de recommandation",
  description: "Trois questions, trois outils adaptés à ton objectif, ton niveau et ton budget. Ou décris ton besoin en texte libre.",
};

export default function PageAssistant() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:py-14">
      <h1 className="text-[30px] leading-9 font-semibold sm:text-h2">
        L'assistant <span className="texte-degrade">Webgiverse</span>
      </h1>
      <p className="mesure mt-2 text-encre">
        Il ne recommande que des outils présents dans l'annuaire, avec leurs vrais tarifs. Aucune invention.
      </p>
      <AssistantOnglets />
    </div>
  );
}