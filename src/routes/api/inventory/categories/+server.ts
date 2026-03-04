import { json } from '@sveltejs/kit';
import { createCategory, getCategories } from '$lib/server/pos';
import { createMockCategory, mockCategories } from '$lib/server/mock';

export async function GET() {
  try {
    return json({ categories: await getCategories(), dbOffline: false });
  } catch (error) {
    console.error('Category list fallback:', error);
    return json({ categories: mockCategories, dbOffline: true });
  }
}

export async function POST({ request }) {
  const body = await request.json();
  const name = String(body.name ?? '').trim();

  if (!name) {
    return json({ message: 'Category name is required.' }, { status: 400 });
  }

  try {
    const category = await createCategory(name);
    return json({ category, dbOffline: false });
  } catch (error) {
    console.error('Create category fallback:', error);
    const category = createMockCategory(name);
    return json({ category, dbOffline: true });
  }
}
