// components/tutoriels/assistant-tutoriel.tsx
// ─────────────────────────────────────────────────────────────────
// LOT 68 — CORRECTIF DU BUILD VERCEL ÉCHOUÉ (commit 1e48e28)
// « Type error: Cannot find name 'Props'. » (assistant-tutoriel.tsx:4)
//
// Ce fichier contenait en réalité TROIS erreurs de type :
//   1. « Props » était référencé dans la signature mais jamais
//      défini dans le fichier (l'erreur affichée par Vercel) ;
//   2. la boucle des messages portait sur « messages », une variable
//      qui n'existe nulle part — la prop reçue s'appelle
//      « conversation » (erreur qui serait apparue juste après) ;
//   3. les champs lisaient « msg.content » alors que le projet
//      utilise « contenu » (type MessageChat de chat-tutoriel.tsx).
//
// Correctifs appliqués, sans changer ni le design ni les classes :
//   · type Props défini avec le MÊME contrat que chat-tutoriel.tsx :
//     MessageChat = { role: "user" | "assistant"; contenu: string } ;
//   · la boucle porte sur « conversation » ;
//   · lecture de « msg.contenu » (2 endroits) ;
//   · « enChargement » est désormais affiché : bulle « L'assistant
//     rédige une réponse… » pendant l'attente de la réponse IA.
//
// À noter : ce composant n'est importé par aucun autre fichier du
// projet (il reste prêt à l'emploi). Il compile désormais sans
// toucher au reste du projet — aucune autre modification nécessaire.
// ─────────────────────────────────────────────────────────────────
// Extrait du composant de l'Assistant IA du tutoriel
import { AffichageMarkdown } from "@/components/commun/affichage-markdown";

// Même forme que le type MessageChat utilisé dans chat-tutoriel.tsx
// (role « user » ou « assistant », champ « contenu »).
type MessageChat = { role: "user" | "assistant"; contenu: string };

type Props = {
  conversation: MessageChat[];
  enChargement: boolean;
};

export function AssistantTutoriel({ conversation, enChargement }: Props) {
  return (
    <div className="flex flex-col h-full max-w-full min-w-0 overflow-hidden rounded-carte border border-bordure bg-white p-4 shadow-sm">
      {/* En-tête de l'assistant */}
      <div className="flex items-center justify-between gap-2 border-b border-bordure pb-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-bleu">
          <span>✨</span> Assistant IA du tutoriel
        </h3>
        <span className="rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-2.5 py-0.5 text-[11px] font-bold text-violet">
          Premium
        </span>
      </div>

      {/* Zone des messages avec défilement propre */}
      <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-4 max-h-[420px] min-w-0">
        {conversation.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col min-w-0 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[95%] rounded-2xl p-3.5 text-[14px] break-words overflow-hidden ${
                msg.role === "user"
                  ? "bg-violet text-white rounded-br-none"
                  : "bg-gris/60 border border-bordure text-bleu rounded-bl-none w-full"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap break-words">{msg.contenu}</p>
              ) : (
                <AffichageMarkdown contenu={msg.contenu} />
              )}
            </div>
          </div>
        ))}

        {/* Bulle d'attente pendant que l'assistant rédige sa réponse */}
        {enChargement && (
          <div className="flex flex-col min-w-0 items-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-bordure bg-gris/60 px-3.5 py-2.5 text-[13px] text-bleu">
              <span className="animate-pulse">●</span> L'assistant rédige une
              réponse…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}