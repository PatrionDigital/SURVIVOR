/**
 * Database Migration Runner
 *
 * Runs SQL migrations in order based on filename prefix (001_, 002_, etc.)
 * Tracks applied migrations in a migrations table to avoid re-running.
 *
 * Usage:
 *   pnpm db:migrate           # Run pending migrations
 *   pnpm db:migrate:status    # Show migration status
 */

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

interface Migration {
  name: string;
  applied_at: Date;
}

async function getPool(): Promise<Pool> {
  const connectionString =
    process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/survivor";

  return new Pool({ connectionString });
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<Migration>("SELECT name FROM _migrations ORDER BY name");
  return new Set(result.rows.map((row) => row.name));
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith(".sql")).sort();
}

async function applyMigration(pool: Pool, filename: string): Promise<void> {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Execute migration
    await client.query(sql);

    // Record migration
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [filename]);

    await client.query("COMMIT");
    console.log(`✓ Applied: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  const pool = await getPool();

  try {
    await ensureMigrationsTable(pool);

    const applied = await getAppliedMigrations(pool);
    const files = await getMigrationFiles();

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log(`Running ${pending.length} migration(s)...\n`);

    for (const file of pending) {
      await applyMigration(pool, file);
    }

    console.log("\nMigrations complete.");
  } finally {
    await pool.end();
  }
}

async function status(): Promise<void> {
  const pool = await getPool();

  try {
    await ensureMigrationsTable(pool);

    const applied = await getAppliedMigrations(pool);
    const files = await getMigrationFiles();

    console.log("Migration Status:\n");
    for (const file of files) {
      const status = applied.has(file) ? "✓ Applied" : "○ Pending";
      console.log(`  ${status}: ${file}`);
    }
  } finally {
    await pool.end();
  }
}

// CLI
const command = process.argv[2];

if (command === "status") {
  status().catch(console.error);
} else {
  migrate().catch(console.error);
}
