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
 * In-flight GET request cache for deduplication.
 * Multiple hooks requesting the same URL concurrently will share a single fetch.
 */
const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Fetches state from the server via GET.
 * Deduplicates concurrent requests to the same URL.
 */
export async function fetchState<T>(
  path: string,
  options: FetchOptions
): Promise<T> {
  const { guestId, headers, baseUrl, signal } = options;

  const url = appendGuestIdParam(buildUrl(path, baseUrl), guestId);

  // Check for an existing in-flight request to the same URL
  const existing = inflightRequests.get(url);
  if (existing) {
    // If the caller has an abort signal, listen for it but don't abort the shared request
    if (signal) {
      return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
        (existing as Promise<T>).then(
          (val) => { signal.removeEventListener('abort', onAbort); resolve(val); },
          (err) => { signal.removeEventListener('abort', onAbort); reject(err); }
        );
      });
    }
    return existing as Promise<T>;
  }

  const request = (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: mergeHeaders(
          { 'Content-Type': 'application/json' },
          headers
        ),
        credentials: 'include',
        // Don't pass signal to the shared fetch — individual callers handle abort above
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Failed to fetch state: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return response.json() as Promise<T>;
    } finally {
      inflightRequests.delete(url);
    }
  })();

  inflightRequests.set(url, request);

  // If the caller has an abort signal, handle it without aborting the shared request
  if (signal) {
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
      request.then(
        (val) => { signal.removeEventListener('abort', onAbort); resolve(val); },
        (err) => { signal.removeEventListener('abort', onAbort); reject(err); }
      );
    });
  }

  return request;
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
