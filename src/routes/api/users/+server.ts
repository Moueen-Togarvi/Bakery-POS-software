import { json } from '@sveltejs/kit';
import { deleteUser, updateUser } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const role = String(body.role ?? 'cashier');
    const salary = Number(body.salary ?? 0);
    const password = String(body.password ?? '');

    if (!Number.isInteger(id) || id <= 0) {
      return json({ message: 'Valid user id required.' }, { status: 400 });
    }
    if (!role) {
      return json({ message: 'Role is required.' }, { status: 400 });
    }

    await updateUser({
      id,
      role,
      salary,
      passwordHash: password || undefined
    });

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User update failed';
    return json({ message }, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const username = String(body.username ?? '');

    if (locals.user && username === locals.user) {
      return json({ message: 'You cannot delete your own account while logged in.' }, { status: 400 });
    }
    if (!Number.isInteger(id) || id <= 0) {
      return json({ message: 'Valid user id required.' }, { status: 400 });
    }

    await deleteUser(id);
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User delete failed';
    return json({ message }, { status: 400 });
  }
};

