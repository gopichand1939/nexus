import pg from 'pg';
import { readFileSync } from 'node:fs';
export function createPool(config) {
  const options = { connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000, statement_timeout: 10000 };
  if (config.dbCa) options.ssl = { ca: readFileSync(config.dbCa, 'utf8'), rejectUnauthorized: true };
  const pool = new pg.Pool(options);
  pool.on('error', () => console.error('Database connection error; no credentials logged.'));
  return pool;
}
