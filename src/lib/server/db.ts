import { neon } from '@neondatabase/serverless';
import dns from 'node:dns';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

// Prefer IPv4 first to avoid intermittent IPv6 routing failures that surface as "fetch failed".
dns.setDefaultResultOrder('ipv4first');

const client = neon(env.DATABASE_URL);
const DEFAULT_MAX_RETRIES = 4;
const CIRCUIT_OPEN_MS = 15_000;
const HARD_NETWORK_CIRCUIT_OPEN_MS = 60_000;
const TRANSIENT_FAILURE_WINDOW_MS = 20_000;
const TRANSIENT_FAILURE_THRESHOLD = 4;
const LOG_THROTTLE_MS = 10_000;

let circuitOpenUntil = 0;
let transientFailureTimestamps: number[] = [];
let lastCircuitLogAt = 0;
const transientLogByKey = new Map<string, number>();

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: any): string {
    const base = (error instanceof Error ? error.message : String(error)).toLowerCase();
    const cause = error?.cause ? String(error.cause).toLowerCase() : '';
    return `${base} ${cause}`.trim();
}

function isTransientError(error: any, errorMessage: string): boolean {
    return (
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('connreset') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('enotfound') ||
        errorMessage.includes('eai_again') ||
        errorMessage.includes('network') ||
        errorMessage.includes('neon') ||
        errorMessage.includes('database error') ||
        errorMessage.includes('response status was 500') ||
        errorMessage.includes('response status was 502') ||
        errorMessage.includes('response status was 503') ||
        errorMessage.includes('response status was 504') ||
        (error?.status >= 500 && error?.status <= 504)
    );
}

function markTransientFailure() {
    const now = Date.now();
    transientFailureTimestamps.push(now);
    transientFailureTimestamps = transientFailureTimestamps.filter(
        (ts) => now - ts <= TRANSIENT_FAILURE_WINDOW_MS
    );

    if (transientFailureTimestamps.length >= TRANSIENT_FAILURE_THRESHOLD) {
        circuitOpenUntil = Math.max(circuitOpenUntil, now + CIRCUIT_OPEN_MS);
        if (now - lastCircuitLogAt > LOG_THROTTLE_MS) {
            lastCircuitLogAt = now;
            console.warn(`[DB] Circuit opened for ${CIRCUIT_OPEN_MS}ms due to repeated transient failures.`);
        }
    }
}

function isHardNetworkFailure(errorMessage: string): boolean {
    return (
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('enotfound') ||
        errorMessage.includes('eai_again')
    );
}

function clearFailureState() {
    transientFailureTimestamps = [];
    circuitOpenUntil = 0;
}

function buildUnavailableError() {
    const retryAfterMs = Math.max(0, circuitOpenUntil - Date.now());
    const err = new Error(`Database temporarily unavailable. Retry after ~${retryAfterMs}ms.`);
    (err as any).code = 'DB_UNAVAILABLE';
    (err as any).retryAfterMs = retryAfterMs;
    return err;
}

function logTransient(attempt: number, maxRetries: number, delay: number, errorMessage: string) {
    const key = `${attempt}|${errorMessage.slice(0, 120)}`;
    const now = Date.now();
    const last = transientLogByKey.get(key) ?? 0;
    if (now - last < LOG_THROTTLE_MS) return;
    transientLogByKey.set(key, now);
    console.warn(
        `[DB] Transient failure (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms... (${errorMessage})`
    );
}

/**
 * Ensures the database schema is up to date.
 * This is a self-healing mechanism requested by the user to avoid errors.
 */
export async function ensureSchema(): Promise<void> {
    console.log('--- Database: Checking Schema Stability ---');
    try {
        await (client as any).query('ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor TEXT');
        await (client as any).query('ALTER TABLE products ADD COLUMN IF NOT EXISTS buying_price DECIMAL(10, 2) NOT NULL DEFAULT 0');
        await (client as any).query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS flavor TEXT');
        await (client as any).query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0');
        console.log('--- Database: Schema check passed (flavor columns exist) ---');
    } catch (error: any) {
        const message = getErrorMessage(error);
        console.warn(`--- Database: Schema check skipped (${message}) ---`);
    }
}

/**
 * Executes a SQL query with automatic retries for transient connection errors.
 */
export async function queryWithRetry(query: string, params: any[] = [], maxRetries = 4): Promise<any> {
    if (Date.now() < circuitOpenUntil) {
        throw buildUnavailableError();
    }

    const retries = Math.max(1, Math.min(maxRetries || DEFAULT_MAX_RETRIES, 6));
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            const result = await (client as any).query(query, params);
            clearFailureState();
            return result;
        } catch (error: any) {
            lastError = error;
            const errorMessage = getErrorMessage(error);

            // Special case: if error is about missing column p.flavor, we try to fix it and retry once
            if (errorMessage.includes('column p.flavor does not exist') && i < retries - 1) {
                console.warn('[DB] Detected missing flavor column. Attempting auto-fix...');
                await ensureSchema();
                continue;
            }

            if (isTransientError(error, errorMessage)) {
                if (isHardNetworkFailure(errorMessage)) {
                    // A hard network failure usually affects all concurrent queries.
                    // Open the circuit immediately to avoid retry storms.
                    const now = Date.now();
                    circuitOpenUntil = Math.max(circuitOpenUntil, now + HARD_NETWORK_CIRCUIT_OPEN_MS);
                    if (now - lastCircuitLogAt > LOG_THROTTLE_MS) {
                        lastCircuitLogAt = now;
                        console.warn(`[DB] Network issue detected. Circuit opened for ${HARD_NETWORK_CIRCUIT_OPEN_MS}ms.`);
                    }
                    throw buildUnavailableError();
                }

                markTransientFailure();
                if (Date.now() < circuitOpenUntil) {
                    throw buildUnavailableError();
                }

                if (i < retries - 1) {
                    // Keep retries short to avoid long UI stalls on flaky networks.
                    const delay = Math.min(Math.pow(2, i) * 250, 1500);
                    logTransient(i + 1, retries, delay, errorMessage);
                    await sleep(delay);
                    continue;
                }
            }

            if (i < retries - 1) {
                // Keep retries short to avoid long UI stalls on flaky networks.
                const delay = Math.min(Math.pow(2, i) * 250, 1500);
                await sleep(delay);
                continue;
            }

            console.error(`[DB] Permanent failure after ${i + 1} attempts: ${errorMessage}`);
            throw error;
        }
    }

    if (Date.now() < circuitOpenUntil) {
        throw buildUnavailableError();
    }

    throw lastError;
}

export const sql = client;

console.log('Attempting DB connection with:', env.DATABASE_URL);
try {
    await client.query('SELECT 1');
    console.log('Database connection successful.');
} catch (err) {
    console.error('Database connection test failed:', getErrorMessage(err), err);
}
