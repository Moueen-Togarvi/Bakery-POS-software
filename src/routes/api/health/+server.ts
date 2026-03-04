import { json } from '@sveltejs/kit';
import { queryWithRetry } from '$lib/server/db';

export const GET = async () => {
    try {
        const start = Date.now();
        const result = await queryWithRetry('SELECT 1 as health');
        const end = Date.now();
        return json({
            status: 'ok',
            latency: `${end - start}ms`,
            db: result ? 'connected' : 'failed'
        });
    } catch (e: any) {
        return json({
            status: 'error',
            message: e.message,
            stack: e.stack
        }, { status: 500 });
    }
};
