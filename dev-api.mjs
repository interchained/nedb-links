/**
 * Dev API wrapper — kills the port-skew trap.
 *
 * The trap (found live by Mark): Vite watches .env and restarts itself
 * with fresh values, but `tsx watch` only watches source files — so an
 * .env port change moved the proxy target while the API kept listening
 * on the OLD port. Every /api call: ECONNREFUSED, surfacing in the UI
 * as "Failed to fetch" at whatever the user touched first (his case:
 * the sign-in challenge).
 *
 * This wrapper spawns `tsx watch server.ts` (source hot-reload stays)
 * and additionally watches .env itself — on change it restarts the API
 * child, so BOTH sides of the proxy re-read the environment together.
 * Zero dependencies, dev-only, never used in production (`npm start`
 * runs tsx directly).
 */

import { spawn } from "node:child_process";
import { existsSync, watchFile, unwatchFile } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");
let child = null;
let restarting = false;
let shuttingDown = false;

function start() {
  child = spawn("npx", ["tsx", "watch", "server.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (restarting) {
      restarting = false;
      start();
      return;
    }
    // Crashed on its own (bad .env, port in use, …): retry with backoff
    // so fixing .env self-heals without a manual restart.
    console.error(
      `[api] exited (${signal ?? code}) — retrying in 2s (fix .env / free the port and it heals itself)`,
    );
    setTimeout(start, 2000);
  });
}

function restart(reason) {
  console.log(`[api] ⟳ ${reason} — restarting so the API re-reads it`);
  restarting = true;
  if (child && !child.killed) child.kill("SIGTERM");
  else start();
}

if (existsSync(ENV_PATH)) {
  watchFile(ENV_PATH, { interval: 700 }, () => restart(".env changed"));
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shuttingDown = true;
    unwatchFile(ENV_PATH);
    if (child && !child.killed) child.kill("SIGTERM");
    process.exit(0);
  });
}

start();
