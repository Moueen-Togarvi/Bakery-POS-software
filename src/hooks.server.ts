import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { ensureSchema } from '$lib/server/db';

// Run schema initialization once on startup
let dbInitialized = false;

export const handle: Handle = async ({ event, resolve }) => {
  if (!dbInitialized) {
    ensureSchema().catch(console.error);
    dbInitialized = true;
  }

  const isLoginPage = event.url.pathname === '/login';
  const isApiUpload = event.url.pathname.startsWith('/api/upload');
  const session = event.cookies.get('session');

  // Allow unauthenticated access to login page
  if (isLoginPage || isApiUpload) {
    return resolve(event);
  }

  // Redirect to login if no session
  if (!session) {
    throw redirect(303, '/login');
  }

  // Define locals
  event.locals.user = session;

  return resolve(event);
};
