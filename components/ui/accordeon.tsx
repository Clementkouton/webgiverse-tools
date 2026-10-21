// components/ui/accordeon.tsx
"use client";
import * as Radix from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export const Accordeon = Radix.Root;

export function ItemAccordeon({ question, reponse }: { question: string; reponse: string }) {
  return (
    <Radix.Item value={question} className="rounded-carte border border-bordure bg-white px-5 shadow-carte">
      <Radix.Header>
        <Radix.Trigger className="flex min-h-11 w-full items-center justify-between gap-4 py-4 text-left font-titre text-[17px] leading-6 font-semibold [&[data-state=open]>svg]:rotate-180">
          {question}
          <ChevronDown className="size-4 shrink-0 text-violet transition-transform duration-200" aria-hidden />
        </Radix.Trigger>
      </Radix.Header>
      <Radix.Content className="overflow-hidden pb-5 text-[16px] leading-6 text-encre">
        <p className="mesure">{reponse}</p>
      </Radix.Content>
    </Radix.Item>
  );
}