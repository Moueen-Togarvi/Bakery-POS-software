import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    return await resolve(event);
  } catch (error) {
    console.error('[UNHANDLED_SERVER_ERROR]', event.url.pathname, error);

    if (event.url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          message: 'Server error occurred. Try again in a moment.'
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    return new Response(
      `<!doctype html>
<html><head><meta charset="utf-8"><title>OvenFresh POS</title></head>
<body style="font-family:Arial,sans-serif;padding:24px;">
<h1>OvenFresh POS</h1>
<p>Server error occurred. Please refresh or try again shortly.</p>
</body></html>`,
      {
        status: 500,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      }
    );
  }
};

export const handleError: HandleServerError = ({ error, event }) => {
  console.error('[HANDLE_ERROR]', event.url.pathname, error);

  return {
    message: 'Unexpected server error'
  };
};
