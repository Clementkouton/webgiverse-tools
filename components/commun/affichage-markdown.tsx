// components/commun/affichage-markdown.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AffichageMarkdownProps {
  contenu: string;
  className?: string;
}

export function AffichageMarkdown({ contenu, className = "" }: AffichageMarkdownProps) {
  return (
    <div className={`prose prose-sm max-w-none text-encre dark:prose-invert break-words text-[14px] leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-3 mb-2 text-[17px] font-bold text-bleu">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-3 mb-2 text-[16px] font-bold text-bleu">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2 mb-1 text-[15px] font-semibold text-bleu">{children}</h3>,
          p: ({ children }) => <p className="mb-2 leading-relaxed break-words">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-violet">{children}</strong>,
          ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-snug">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[13px] text-violet">
              {children}
            </code>
          ),
        }}
      >
        {contenu}
      </ReactMarkdown>
    </div>
  );
}