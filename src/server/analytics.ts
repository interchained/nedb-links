/**
 * Analytics — the events collection made visible.
 *
 * Every number on the dashboard is a LIVE NQL GROUP BY against the
 * engine at request time. Nothing is precomputed, nothing is cached,
 * no counter documents exist to drift out of sync: the append-only
 * event log IS the analytics store, and the engine's aggregation is
 * the analytics engine. This endpoint is the dogfooding mission in
 * one file.
 *
 *   views          FROM events WHERE identityId='…' GROUP BY kind
 *   scans vs taps  … AND kind='profile_view' GROUP BY source
 *   top links      … AND kind='link_click'  GROUP BY blockId
 *
 * Engine grammar notes (probed live against nedbd 2.6.1):
 *   - GROUP BY returns [{ <field>, count }] rows.
 *   - ORDER BY on grouped rows returns [] silently — sort server-side.
 *   - SELECT COUNT(*) is not the grammar; FROM-first only.
 */

import { Router } from "express";

import { COLLECTIONS, type IdentityManifest } from "../lib/identity";
import { authOf, requireUser } from "./auth";
import { db } from "./db";
import { hasRole } from "./grants";
import { getManifest } from "./identities";
import { wrap } from "./util";

export const analytics = Router({ mergeParams: true });

/** identityIds are ours (idn_ + hex) — validate before NQL interpolation.
 *  Defense in depth: no quoting gymnastics, just a strict format gate. */
const SAFE_ID = /^idn_[a-z0-9]{6,64}$/i;

interface GroupRow {
  count?: unknown;
  [k: string]: unknown;
}

/** One live GROUP BY, normalized to sorted {key, count} rows. */
async function groupCount(
  where: string,
  by: string,
): Promise<Array<{ key: string; count: number }>> {
  const rows = (await db.query(
    `FROM ${COLLECTIONS.events} WHERE ${where} GROUP BY ${by}`,
  )) as GroupRow[];
  return rows
    .map((r) => ({
      key: String(r[by] ?? "unknown"),
      count: Number(r.count) || 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function blockLabel(m: IdentityManifest, blockId: string): { label: string; url: string | null } {
  const b = m.blocks.find((x) => x.id === blockId);
  if (!b) return { label: "(removed block)", url: null };
  const d = b.data as Record<string, unknown>;
  switch (b.type) {
    case "link":
      return {
        label: typeof d.label === "string" && d.label ? d.label : "(untitled link)",
        url: typeof d.url === "string" ? d.url : null,
      };
    case "embed":
      return {
        label: typeof d.title === "string" && d.title ? d.title : "(embed)",
        url: typeof d.url === "string" ? d.url : null,
      };
    case "social":
      return { label: "(social row)", url: null };
    default:
      return { label: `(${b.type})`, url: null };
  }
}

/** GET /api/identities/:id/analytics — viewer-gated, live from the engine. */
analytics.get("/", requireUser, wrap(async (req, res) => {
  const auth = authOf(res);
  if (!auth) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const identityId = String((req.params as Record<string, string>).id ?? "");
  if (!SAFE_ID.test(identityId)) {
    res.status(400).json({ error: "invalid identity id" });
    return;
  }
  if (!(await hasRole(identityId, auth, "viewer"))) {
    res.status(403).json({ error: "viewer role required" });
    return;
  }
  const manifest = await getManifest(identityId);
  if (!manifest) {
    res.status(404).json({ error: "identity not found" });
    return;
  }

  const idWhere = `identityId = '${identityId}'`;
  const [byKind, viewsBySource, clicksByBlock] = await Promise.all([
    groupCount(idWhere, "kind"),
    groupCount(`${idWhere} AND kind = 'profile_view'`, "source"),
    groupCount(`${idWhere} AND kind = 'link_click'`, "blockId"),
  ]);

  const kind = (k: string) => byKind.find((r) => r.key === k)?.count ?? 0;
  const source = (s: string) => viewsBySource.find((r) => r.key === s)?.count ?? 0;

  res.json({
    identityId,
    handle: manifest.handle,
    totals: {
      views: kind("profile_view"),
      scans: source("qr"),
      taps: source("direct"),
      linkClicks: kind("link_click"),
      vcardDownloads: kind("vcard_download"),
    },
    viewsBySource: viewsBySource.map(({ key, count }) => ({ source: key, count })),
    topLinks: clicksByBlock.map(({ key, count }) => ({
      blockId: key,
      ...blockLabel(manifest, key),
      count,
    })),
    asOf: new Date().toISOString(),
  });
}));
