import { json } from '@sveltejs/kit';
import { returnOrder } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { orderId } = await request.json();
        if (!orderId) {
            return json({ message: 'Order ID is required' }, { status: 400 });
        }

        await returnOrder(orderId);
        return json({ success: true, message: 'Order returned successfully and stock replenished.' });
    } catch (error) {
        console.error('Return Order API error:', error);
        return json({ message: error instanceof Error ? error.message : 'Error returning order' }, { status: 500 });
    }
};
