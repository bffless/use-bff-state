import type { PersistenceOption } from './types';

const COOKIE_NAME = 'bff-guest-id';
const MAX_AGE_FOREVER = 400 * 24 * 60 * 60; // 400 days in seconds (browser max)

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID if available, otherwise falls back to a manual implementation.
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculates the max-age value in seconds for a persistence option.
 */
export function getMaxAge(persistence: PersistenceOption): number | undefined {
  if (persistence === 'session') {
    return undefined; // Session cookie - no max-age
  }
  if (persistence === 'forever') {
    return MAX_AGE_FOREVER;
  }
  if (typeof persistence === 'object' && 'days' in persistence) {
    return persistence.days * 24 * 60 * 60;
  }
  return MAX_AGE_FOREVER; // Default to forever
}

/**
 * Parses a cookie string and returns a map of cookie name to value.
 */
export function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(';').forEach((cookie) => {
    const [name, ...valueParts] = cookie.split('=');
    if (name) {
      const trimmedName = name.trim();
      const value = valueParts.join('=').trim();
      cookies[trimmedName] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Reads the guest ID from cookies.
 */
export function readGuestId(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = parseCookies(document.cookie);
  return cookies[COOKIE_NAME] || null;
}

/**
 * Writes the guest ID to cookies with the specified persistence.
 */
export function writeGuestId(
  guestId: string,
  persistence: PersistenceOption
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const maxAge = getMaxAge(persistence);
  let cookieValue = `${COOKIE_NAME}=${encodeURIComponent(guestId)}; path=/; SameSite=Lax`;

  if (maxAge !== undefined) {
    cookieValue += `; max-age=${maxAge}`;
  }

  document.cookie = cookieValue;
}

/**
 * Gets the existing guest ID or generates a new one.
 * Writes the cookie if a new ID was generated or if persistence settings changed.
 */
export function getOrCreateGuestId(persistence: PersistenceOption): string {
  const existingId = readGuestId();

  if (existingId) {
    // Refresh the cookie to extend its lifetime
    writeGuestId(existingId, persistence);
    return existingId;
  }

  const newId = generateUuid();
  writeGuestId(newId, persistence);
  return newId;
}

/**
 * Creates a guest ID manager with lazy initialization.
 * The guest ID is only generated when first accessed.
 */
export function createGuestIdManager(persistence: PersistenceOption): {
  getGuestId: () => string;
} {
  let cachedId: string | null = null;

  return {
    getGuestId: () => {
      if (cachedId === null) {
        cachedId = getOrCreateGuestId(persistence);
      }
      return cachedId;
    },
  };
}
