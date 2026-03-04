import { json } from '@sveltejs/kit';
import { getOrderReceipt } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const orderId = Number(url.searchParams.get('orderId'));
        if (!orderId) {
            return json({ message: 'Order ID is required' }, { status: 400 });
        }

        const receipt = await getOrderReceipt(orderId);
        return json({ receipt });
    } catch (error) {
        console.error('Order Receipt API error:', error);
        return json({ message: error instanceof Error ? error.message : 'Error fetching receipt' }, { status: 500 });
    }
};
