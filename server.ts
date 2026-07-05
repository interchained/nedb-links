/**
 * NEDB Links — Express server bootstrap.
 *
 * NEDB stores knowledge. Portal renders experiences. Links publishes identity.
 *
 * App assembly lives in src/server/app.ts (createApp) so tests can boot
 * the real app against a real nedbd. This file only loads env, ensures
 * the database, and listens.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Minimal .env loader (no dependency). Real env always wins. */
function loadEnv(): void {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

// Imported AFTER loadEnv so config reads the resolved environment.
const { config } = await import("./src/server/config");
const { createApp, ensureDatabase } = await import("./src/server/app");
const { warnIfOpen } = await import("./src/server/auth");

// Ensure the database exists BEFORE the first write. Idempotent.
// Works around a nedbd 2.6.1 interop bug found in Links' first smoke test:
// on an unknown-db 404 the daemon responds without draining the request
// body, so the client's auto-create retry on the same keep-alive socket
// gets misparsed ("Bad request syntax"). Creating the db up front keeps
// every write on the happy path. Proper fix lands engine-side.
await ensureDatabase();

createApp().listen(config.port, () => {
  console.log(`\x1b[36m⬡ NEDB Links\x1b[0m listening on :${config.port}`);
  console.log(`  nedbd → ${config.nedbUrl} (db: ${config.nedbDb})`);
  warnIfOpen();
});
