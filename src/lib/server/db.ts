import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const client = neon(env.DATABASE_URL);

/**
 * Ensures the database schema is up to date.
 * This is a self-healing mechanism requested by the user to avoid errors.
 */
export async function ensureSchema(): Promise<void> {
    console.log('--- Database: Checking Schema Stability ---');
    try {
        await (client as any).query('ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor TEXT');
        await (client as any).query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS flavor TEXT');
        console.log('--- Database: Schema check passed (flavor columns exist) ---');
    } catch (error) {
        console.error('--- Database: Schema initialization failed:', error);
    }
}

/**
 * Executes a SQL query with automatic retries for transient connection errors.
 */
export async function queryWithRetry(query: string, params: any[] = [], maxRetries = 5): Promise<any> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await (client as any).query(query, params);
        } catch (error: any) {
            lastError = error;
            const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();

            // Broad transient error surface for Neon/Serverless
            const isTransient =
                errorMessage.includes('timeout') ||
                errorMessage.includes('fetch failed') ||
                errorMessage.includes('connreset') ||
                errorMessage.includes('etimedout') ||
                errorMessage.includes('econnreset') ||
                errorMessage.includes('neon') ||
                errorMessage.includes('database error') ||
                errorMessage.includes('response status was 500') ||
                errorMessage.includes('response status was 503') ||
                (error.status >= 500 && error.status <= 504);

            if (isTransient && i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000; // More aggressive backoff starting at 1s
                console.warn(`[DB] Transient failure (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms... (${errorMessage})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Special case: if error is about missing column p.flavor, we try to fix it and retry once
            if (errorMessage.includes('column p.flavor does not exist') && i < maxRetries - 1) {
                console.warn('[DB] Detected missing flavor column. Attempting auto-fix...');
                await ensureSchema();
                continue;
            }

            console.error(`[DB] Permanent failure after ${i + 1} attempts:`, errorMessage);
            throw error;
        }
    }
    throw lastError;
}

export const sql = client;
