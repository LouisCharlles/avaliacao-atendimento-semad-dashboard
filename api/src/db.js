import pg from 'pg';
import { config } from './config.js';

// Mantém colunas BIGINT/COUNT como número (os volumes deste sistema cabem com folga).
pg.types.setTypeParser(20, (v) => Number(v));
// NUMERIC (médias, percentuais) como número.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export function query(text, params) {
  return pool.query(text, params);
}
