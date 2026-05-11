import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  const storeName = 'hot&Cold';

  await (sql as any).query(
    `
      INSERT INTO settings (key, value)
      VALUES ('store_name', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `,
    [storeName]
  );

  const rows = await (sql as any).query("SELECT key, value FROM settings WHERE key = 'store_name'");
  console.log(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
