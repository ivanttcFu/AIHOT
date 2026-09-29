// Dry-runs the industry source list: for every source it fetches the listing and runs the
// same parser the collector uses, so you can see what a crawl would actually ingest before
// wiring it up. Sources that yield navigation menus or nothing are reported, not silently
// accepted — a listing whose itemSelector misses returns the page's menu, which is exactly
// the failure the config gate cannot catch. A source is reported unless it yields ENOUGH
// headlines, so a menu with one long link in it (a business page, a licence PDF) is not an "ok".
//
// Usage: node scripts/check-sources.ts [sourceIdPrefix …]
//   node scripts/check-sources.ts                 # all sources
//   node scripts/check-sources.ts official- web-  # only these prefixes
//
// Needs network. It makes one request per source, sequentially, and never writes anything.
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { assertSupportedConfig } from "@aihot/backend/sources/config-keys";
import { fetchWebList } from "@aihot/backend/sources/web-list";
import { fetchJsonList } from "@aihot/backend/sources/json-list";
import type { Candidate, SourceRow } from "@aihot/backend/sources/types";

/** A title this long is a headline; shorter ones are menu items ("关于我们", "首页"). */
const HEADLINE = 10;
/** An article list yields several. A menu that slipped through yields none, or one or two long
 *  non-articles: tanwan's "GAME LOVIN" business-page anchor, sanqi's ICP licence PDFs. */
const ENOUGH = 3;

const prefixes = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const { sources } = JSON.parse(readFileSync(path.join(REPO_ROOT, "industry/sources.json"), "utf8")) as { sources: SourceRow[] };

function fetchFor(kind: SourceRow["kind"]): ((s: SourceRow) => Promise<Candidate[]>) | null {
  if (kind === "web_list") return fetchWebList;
  if (kind === "json_list") return fetchJsonList;
  return null;
}

let failures = 0;
for (const s of sources) {
  if (prefixes.length && !prefixes.some((p) => s.id.startsWith(p))) continue;
  assertSupportedConfig(s.kind, s.config ?? {});
  const fetchOne = fetchFor(s.kind);
  if (!fetchOne) {
    console.log(`${s.id.padEnd(22)} ${s.kind.padEnd(10)} (not auto-collected; skipped)`);
    continue;
  }
  let items: Candidate[] = [];
  let note = "";
  try {
    items = await fetchOne(s);
  } catch (error) {
    note = error instanceof Error ? error.message : String(error);
  }
  const headlines = items.filter((c) => c.title.length >= HEADLINE);
  const verdict = headlines.length >= ENOUGH ? "ok" : headlines.length ? "TOO FEW" : "NO HEADLINES";
  if (headlines.length < ENOUGH) failures++;
  console.log(`${s.id.padEnd(22)} ${s.kind.padEnd(10)} items=${String(items.length).padEnd(4)} headlines=${String(headlines.length).padEnd(4)} ${verdict} ${note}`);
  for (const c of headlines.slice(0, 3)) console.log(`    · ${c.title.slice(0, 46)}\n      ${c.url.slice(0, 88)}`);
}
console.log(failures ? `\n${failures} source(s) yielded no article list — check itemSelector/titleSelector.` : "\nAll collected sources yielded headlines.");
process.exitCode = failures ? 1 : 0;
