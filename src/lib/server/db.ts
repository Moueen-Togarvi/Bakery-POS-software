import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const connectionString = env.DATABASE_URL;

let sqlClient: ReturnType<typeof postgres> | null = null;

if (connectionString) {
  sqlClient = postgres(connectionString, {
    ssl: 'require',
    max: 10
  });
}

export function getSql() {
  if (!sqlClient) {
    throw new Error('DATABASE_URL is missing. Add your Neon PostgreSQL connection string.');
  }
  return sqlClient;
}
