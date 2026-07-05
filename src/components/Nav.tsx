import React, { useEffect, useState } from "react";
import { Link } from "@interchained/portal-react";

import { clearSession, getAddress, getToken } from "../lib/api";

/** itc1qxy2k…x0wlh — inline (keeps wallet crypto out of the nav bundle). */
function shortAddr(addr: string): string {
  return addr.length <= 16 ? addr : `${addr.slice(0, 10)}…${addr.slice(-5)}`;
}

export function Nav(): React.ReactElement {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(getAddress());
  }, []);

  return (
    <nav className="w-full border-b border-ink-800 bg-ink-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-lg tracking-tight">
          <span className="text-accent">⬡</span> NEDB Links
        </Link>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/identities" className="text-slate-300 hover:text-accent-soft transition">
            Identities
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-accent/10 border border-accent/40 text-accent-soft px-3 py-1.5 hover:bg-accent/20 transition"
          >
            + Claim
          </Link>
          {address && (
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[11px] text-slate-400 border border-ink-700 rounded-full px-2.5 py-1"
                title={address}
              >
                {shortAddr(address)}
              </span>
              <button
                onClick={() => {
                  void fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { authorization: `Bearer ${getToken() ?? ""}` },
                  }).catch(() => undefined);
                  clearSession();
                  window.location.href = "/";
                }}
                className="text-slate-500 hover:text-signal-red transition text-xs"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
