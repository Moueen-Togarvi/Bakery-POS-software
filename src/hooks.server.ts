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

  const pathname = event.url.pathname;
  const isRoutedRequest = event.route.id !== null;
  const isLoginPage = pathname === '/login';
  const session = event.cookies.get('session');

  // Skip static/assets and other non-routed requests
  if (!isRoutedRequest) {
    return resolve(event);
  }

  // Define locals for routed requests
  event.locals.user = session || '';

  // If already logged in and trying to access login, redirect to home
  if (session && isLoginPage) {
    throw redirect(303, '/');
  }

  // Allow unauthenticated access only to login page
  if (isLoginPage) {
    return resolve(event);
  }

  // Redirect to login if there is no session for any protected route
  if (!session) {
    throw redirect(303, '/login');
  }

  return resolve(event);
};
