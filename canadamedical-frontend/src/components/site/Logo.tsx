import { Link } from "@tanstack/react-router";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  const text = inverse ? "text-primary-foreground" : "text-primary";
  return (
    <Link to="/" className={`group flex items-center gap-2.5 ${text}`} aria-label="MedConnect Canada home">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-glow transition group-hover:scale-105">
        <MapleLeaf className="h-5 w-5 text-primary" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </span>
      <span className="flex items-baseline gap-1 text-[17px] font-extrabold tracking-tight">
        MedConnect
        <span className="text-gradient-accent font-bold">Canada</span>
      </span>
    </Link>
  );
}

function MapleLeaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.6 3.4 3.6-.9-1.1 3.6 3.4 1.6-2.7 2.4 1.4 3.5-3.7-.6-.4 3.7-2.1-3-2.1 3-.4-3.7-3.7.6 1.4-3.5L4.5 10.2l3.4-1.6-1.1-3.6 3.6.9L12 2.5z" />
    </svg>
  );
}