import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

const reset = process.argv.includes('--reset');

const connStr = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connStr) {
  console.error(
    'Error: set DATABASE_URL_UNPOOLED (or DATABASE_URL) in .env before running this script.'
  );
  process.exit(1);
}

const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected to Neon.');

  if (reset) {
    console.log('--reset: dropping and recreating public schema...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  console.log('Applying docs/schema.sql...');
  const schema = readFileSync(resolve(root, 'docs', 'schema.sql'), 'utf8');
  await client.query(schema);
  console.log('Schema applied.');

  console.log('Applying docs/seed.sql...');
  const seed = readFileSync(resolve(root, 'docs', 'seed.sql'), 'utf8');
  await client.query(seed);
  console.log('Seed applied.');

  // Verification summary
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log('\nTables created:');
  tables.rows.forEach(r => console.log(' ', r.table_name));

  const counts = await client.query(`
    SELECT 'regions'           AS tbl, count(*)::int AS n FROM regions
    UNION ALL
    SELECT 'prefectures',      count(*)::int FROM prefectures
    UNION ALL
    SELECT 'ranks',            count(*)::int FROM ranks
    UNION ALL
    SELECT 'prayer_categories',count(*)::int FROM prayer_categories
    UNION ALL
    SELECT 'shrines',          count(*)::int FROM shrines
  `);
  console.log('\nCatalog row counts:');
  counts.rows.forEach(r => console.log(`  ${r.tbl}: ${r.n}`));

  console.log('\nDone.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
