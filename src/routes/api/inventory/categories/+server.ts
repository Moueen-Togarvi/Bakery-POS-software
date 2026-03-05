import { json } from '@sveltejs/kit';
import { createCategory, getCategories } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    return json({ categories: await getCategories(), dbOffline: false });
  } catch (error) {
    console.error('Category list error:', error);
    return json({ message: 'Error fetching categories' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const name = String(body.name ?? '').trim();

  if (!name) {
    return json({ message: 'Category name is required.' }, { status: 400 });
  }

  try {
    const category = await createCategory(name);
    return json({ category, dbOffline: false });
  } catch (error) {
    console.error('Create category error:', error);
    return json({ message: 'Error creating category' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const id = Number(body.id);
  const name = String(body.name ?? '').trim();

  if (!id || !name) {
    return json({ message: 'Category ID and name are required.' }, { status: 400 });
  }

  try {
    const category = await import('$lib/server/pos').then(m => m.updateCategory(id, name));
    return json({ category, dbOffline: false });
  } catch (error) {
    console.error('Update category error:', error);
    return json({ message: (error as Error).message || 'Error updating category' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const id = Number(body.id);

  if (!id) {
    return json({ message: 'Category ID is required.' }, { status: 400 });
  }

  try {
    await import('$lib/server/pos').then(m => m.deleteCategory(id));
    return json({ message: 'Category deleted', dbOffline: false });
  } catch (error) {
    console.error('Delete category error:', error);
    return json({ message: (error as Error).message || 'Error deleting category' }, { status: 500 });
  }
};
