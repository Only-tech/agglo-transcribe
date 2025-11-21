import { Pool } from 'pg';

// 'db' est le nom du service dans docker-compose.yml
const connectionString = process.env.DATABASE_URL;
// const connectionString = process.env.DATABASE_URL || 'postgresql://transcription:transcription@db:5432/transcription_db';

declare global {
  // Stocke le pool dans le cache global en dév
  var pool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === "production") {
  pool = new Pool({ connectionString });
} else {
  if (!global.pool) {
    global.pool = new Pool({ connectionString });
  }
  pool = global.pool;
}

export const db = pool;