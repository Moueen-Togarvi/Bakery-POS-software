import type { Cookies } from '@sveltejs/kit';

export type FlashToast = {
  type: 'success' | 'error' | 'info';
  message: string;
  subMessage?: string;
};

const FLASH_COOKIE = 'flash_toast';

export function setFlashToast(cookies: Cookies, toast: FlashToast) {
  cookies.set(FLASH_COOKIE, JSON.stringify(toast), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 10
  });
}

export function consumeFlashToast(cookies: Cookies): FlashToast | null {
  const raw = cookies.get(FLASH_COOKIE);
  if (!raw) return null;

  cookies.delete(FLASH_COOKIE, { path: '/' });

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.message !== 'string' || typeof parsed.type !== 'string') {
      return null;
    }

    return {
      type: parsed.type,
      message: parsed.message,
      subMessage: typeof parsed.subMessage === 'string' ? parsed.subMessage : undefined
    };
  } catch {
    return null;
  }
}
