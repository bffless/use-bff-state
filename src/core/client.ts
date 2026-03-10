/**
 * Options for making a fetch request.
 */
export interface FetchOptions {
  guestId: string;
  headers?: Record<string, string>;
  baseUrl?: string;
  signal?: AbortSignal;
}

/**
 * Appends the guest ID query parameter to a URL.
 */
export function appendGuestIdParam(url: string, guestId: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_bffGuestId=${encodeURIComponent(guestId)}`;
}

/**
 * Builds the full URL with base URL prefix.
 */
export function buildUrl(path: string, baseUrl: string = ''): string {
  // If path is already an absolute URL, return it as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Normalize: remove trailing slash from baseUrl, ensure path starts with /
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Merges header objects, with later objects taking precedence.
 */
export function mergeHeaders(
  ...headerObjects: (Record<string, string> | undefined)[]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const headers of headerObjects) {
    if (headers) {
      Object.assign(result, headers);
    }
  }

  return result;
}

/**
 * Fetches state from the server via GET.
 */
export async function fetchState<T>(
  path: string,
  options: FetchOptions
): Promise<T> {
  const { guestId, headers, baseUrl, signal } = options;

  const url = appendGuestIdParam(buildUrl(path, baseUrl), guestId);

  const response = await fetch(url, {
    method: 'GET',
    headers: mergeHeaders(
      { 'Content-Type': 'application/json' },
      headers
    ),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Failed to fetch state: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Updates state on the server via POST.
 */
export async function updateState<T>(
  path: string,
  data: T,
  options: FetchOptions
): Promise<T> {
  const { guestId, headers, baseUrl, signal } = options;

  const url = appendGuestIdParam(buildUrl(path, baseUrl), guestId);

  const response = await fetch(url, {
    method: 'POST',
    headers: mergeHeaders(
      { 'Content-Type': 'application/json' },
      headers
    ),
    credentials: 'include',
    body: JSON.stringify(data),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Failed to update state: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}
