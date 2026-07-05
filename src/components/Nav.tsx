import React from "react";
import { Link } from "@interchained/portal-react";

export function Nav(): React.ReactElement {
  return (
    <nav className="w-full border-b border-ink-800 bg-ink-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-lg tracking-tight">
          <span className="text-accent">⬡</span> NEDB Links
        </Link>
        <div className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/identities" className="text-slate-300 hover:text-accent-soft transition">
            Identities
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-accent/10 border border-accent/40 text-accent-soft px-3 py-1.5 hover:bg-accent/20 transition"
          >
            + Claim
          </Link>
        </div>
      </div>
    </nav>
  );
}
