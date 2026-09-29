// Runs the backend tests that need no database. `npm test` runs every file under tests/, and most
// of them write rows: they need a live PostgreSQL. (tests/setup.ts only checks that the database
// name ends in _test or _ci — the connection happens on the first query, so a file that never
// queries runs fine without a server.) This script picks out the files that never touch the
// database, so a machine with no Postgres can still check source parsing, URL safety and the
// small helpers.
//
// Usage: npm run test:offline
//        node scripts/test-offline.ts
//
// A file counts as database-free when it does not import @aihot/backend/db, so a test that starts
// using the database drops out of this subset on its own. This is a convenience, not a substitute
// for `npm test`: run the full suite against a real PostgreSQL before shipping.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";

const dir = path.join(REPO_ROOT, "tests");
const all = readdirSync(dir)
  .filter((f) => f.endsWith(".test.ts"))
  .sort();
const offline = all.filter((f) => !readFileSync(path.join(dir, f), "utf8").includes("@aihot/backend/db"));

if (offline.length === 0) {
  console.error("no database-free tests under tests/ — nothing to run");
  process.exit(1);
}

// setup.ts refuses to load unless the name ends in _test or _ci. These files never connect, so a
// placeholder is enough: no server, no credentials.
const env = { ...process.env };
if (!/_(test|ci)(\?|$)/.test(env.DATABASE_URL ?? "")) env.DATABASE_URL = "postgres://localhost:5432/aihot_test";

console.log(`Running ${offline.length} of ${all.length} test files — the ones that need no database:`);
for (const f of offline) console.log(`  tests/${f}`);
console.log("");

const run = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", "--test-timeout=120000", ...offline.map((f) => path.join("tests", f))],
  { cwd: REPO_ROOT, env, stdio: "inherit" },
);
process.exit(run.status ?? 1);
