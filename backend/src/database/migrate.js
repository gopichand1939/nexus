import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config/env.js';
import { createPool } from './pool.js';
const pool = createPool(loadConfig());
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(83764291)");
  await client.query('CREATE TABLE IF NOT EXISTS nexus_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const folder = fileURLToPath(new URL('./migrations/', import.meta.url));
  for (const name of (await readdir(folder)).filter(x => x.endsWith('.sql')).sort()) {
    const previous = await client.query('SELECT name FROM nexus_migrations WHERE name=$1', [name]);
    if (previous.rowCount) continue;
    await client.query(await readFile(`${folder}/${name}`, 'utf8'));
    await client.query('INSERT INTO nexus_migrations(name) VALUES($1)', [name]);
    console.log(`Applied ${name}`);
  }
  await client.query('COMMIT');
} catch (error) { await client.query('ROLLBACK'); console.error('Migration failed:', error.code || 'configuration error'); process.exitCode = 1; }
finally { client.release(); await pool.end(); }
