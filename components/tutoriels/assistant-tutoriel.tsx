// Extrait du composant de l'Assistant IA du tutoriel
import { AffichageMarkdown } from "@/components/commun/affichage-markdown";

export function AssistantTutoriel({ conversation, enChargement }: Props) {
  return (
    <div className="flex flex-col h-full max-w-full min-w-0 overflow-hidden rounded-carte border border-bordure bg-white p-4 shadow-sm">
      {/* En-tête de l'assistant */}
      <div className="flex items-center justify-between gap-2 border-b border-bordure pb-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-bleu">
          <span>✨</span> Assistant IA du tutoriel
        </h3>
        <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-bold text-violet">
          Premium
        </span>
      </div>

      {/* Zone des messages avec défilement propre */}
      <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-4 max-h-[420px] min-w-0">
        {messages.map((msg, index) => (
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
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              ) : (
                <AffichageMarkdown contenu={msg.content} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}