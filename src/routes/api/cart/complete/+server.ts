import { json } from '@sveltejs/kit';
import { completeOpenOrder, getCartSummary } from '$lib/server/pos';
import { completeFallbackSale } from '$lib/server/fallback-cart';

export async function POST() {
  try {
    const receipt = await completeOpenOrder();
    const cart = await getCartSummary();
    return json({ receipt, cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sale could not be completed.';

    if (message === 'Cannot complete empty order') {
      return json({ message }, { status: 400 });
    }

    try {
      const result = completeFallbackSale();
      return json(result);
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Sale could not be completed.';
      return json({ message: fallbackMessage }, { status: 400 });
    }
  }
}
