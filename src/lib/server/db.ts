import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const connectionString = env.DATABASE_URL;

let sqlClient: ReturnType<typeof postgres> | null = null;

if (connectionString) {
  sqlClient = postgres(connectionString, {
    ssl: 'require',
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    max_lifetime: 60 * 30
  });
}

export function getSql() {
  if (!sqlClient) {
    throw new Error('DATABASE_URL is missing or connection failed. Add your Neon PostgreSQL connection string.');
  }
  return sqlClient;
}
