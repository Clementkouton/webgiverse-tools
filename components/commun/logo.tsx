// components/commun/logo.tsx — identité « W + Webgiverse + Hub »
import Link from "next/link";

export function LogoWebgiverse({ compacte = false }: { compacte?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="wgv" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#00D1FF" />
            <stop offset="1" stopColor="#6A3BFF" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#wgv)" />
        <path d="M6 10 L9.4 22 L12.9 12.5 L16 20 L19.1 12.5 L22.6 22 L26 10"
          stroke="#fff" strokeWidth="2.4" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compacte && (
        <>
          <span className="font-titre text-[19px] font-bold text-bleu">Webgiverse</span>
          <span className="rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff)] px-2.5 py-1 text-[12px] leading-4 font-bold text-white">Hub</span>
        </>
      )}
    </span>
  );
}

export function LienLogo() {
  return (
    <Link href="/" aria-label="Webgiverse — accueil" className="shrink-0">
      <LogoWebgiverse />
    </Link>
  );
}