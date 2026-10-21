// components/commun/bouton-confirmer.tsx
"use client";
export function BoutonConfirmer({ message, children, ...props }: React.ComponentProps<"button"> & { message: string }) {
  return (
    <button {...props} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}