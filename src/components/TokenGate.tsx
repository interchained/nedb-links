import React, { useState } from "react";
import { setToken } from "../lib/api";

/**
 * Shown when the API answers 401 — the instance runs with
 * LINKS_ADMIN_TOKEN set. Stores the token locally and retries.
 */
export function TokenGate({ onReady }: { onReady: () => void }): React.ReactElement {
  const [value, setValue] = useState("");

  return (
    <div className="max-w-md mx-auto mt-20 bg-ink-900 border border-ink-700 rounded-2xl p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-signal-amber">
        admin token required
      </p>
      <h2 className="font-display text-2xl font-bold mt-2">This instance is locked</h2>
      <p className="text-slate-400 text-sm mt-2">
        Enter the LINKS_ADMIN_TOKEN configured on the server. It is stored only in this
        browser.
      </p>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value) {
            setToken(value);
            onReady();
          }
        }}
        placeholder="••••••••••••"
        autoFocus
        className="mt-5 w-full bg-ink-850 border border-ink-700 rounded-xl px-4 py-3 outline-none focus:border-accent/60 text-slate-100 font-mono text-center"
      />
      <button
        onClick={() => {
          if (value) {
            setToken(value);
            onReady();
          }
        }}
        disabled={!value}
        className="mt-4 w-full rounded-xl bg-accent text-ink-950 font-bold py-3 transition hover:brightness-110 disabled:opacity-40"
      >
        Unlock
      </button>
    </div>
  );
}
