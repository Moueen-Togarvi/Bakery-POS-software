import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const client = neon(env.DATABASE_URL);

/**
 * Executes a SQL query with automatic retries for transient connection errors.
 */
export async function queryWithRetry(query: string, params: any[] = [], maxRetries = 3): Promise<any> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await (client as any).query(query, params);
        } catch (error: any) {
            lastError = error;
            // Retry on ETIMEDOUT or fetch failed errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isTransient = errorMessage.includes('ETIMEDOUT') ||
                errorMessage.includes('fetch failed') ||
                errorMessage.includes('ECONNRESET');

            if (isTransient && i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 500; // Exponential backoff: 500ms, 1000ms, 2000ms
                console.warn(`Database query failed (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms... Error: ${errorMessage}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

export const sql = client;
