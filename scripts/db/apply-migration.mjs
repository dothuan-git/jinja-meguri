import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const migrationsDir = resolve(root, 'docs', 'migrations');

const connStr = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connStr) {
  console.error(
    'Error: set DATABASE_URL_UNPOOLED (or DATABASE_URL) in .env before running this script.'
  );
  process.exit(1);
}

// Apply every docs/migrations/*.sql in filename order. Migrations are written to
// be idempotent (ADD COLUMN IF NOT EXISTS, UPDATE … keyed on stable columns), so
// re-running is safe and additive-only — the old schema is never dropped.
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migration files found in docs/migrations/.');
  process.exit(0);
}

const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected to Neon.');

  for (const file of files) {
    console.log(`Applying docs/migrations/${file}...`);
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
    await client.query(sql);
    console.log(`  ${file} applied.`);
  }

  console.log('\nDone. All migrations applied.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
