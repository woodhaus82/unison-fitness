// One-off migration runner: applies supabase/migrations/*.sql (and
// optionally seed.sql) directly against a Postgres connection string, in
// order. Used instead of the Supabase CLI so we don't need an interactive
// `supabase login` browser flow just to push schema.
//
// Usage: DATABASE_URL="postgresql://..." node scripts/migrate.mjs [--seed]

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const migrationsDir = join(rootDir, "supabase", "migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Set DATABASE_URL to your Supabase Postgres connection string first.");
  process.exit(1);
}

const includeSeed = process.argv.includes("--seed");

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await client.query(sql);
  }

  if (includeSeed) {
    console.log("Applying seed.sql...");
    const sql = readFileSync(join(rootDir, "supabase", "seed.sql"), "utf8");
    await client.query(sql);
  }

  console.log("Done.");
} finally {
  await client.end();
}
