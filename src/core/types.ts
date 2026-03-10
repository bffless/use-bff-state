/**
 * Persistence options for the guest ID cookie.
 * - 'session': Cookie expires when browser closes
 * - { days: N }: Cookie persists for N days
 * - 'forever': Cookie persists for 400 days (browser max)
 */
export type PersistenceOption =
  | 'session'
  | { days: number }
  | 'forever';

/**
 * Configuration options for the BffStateProvider.
 */
export interface BffStateProviderOptions {
  /**
   * Additional headers to include in all requests.
   * These are merged with any per-hook headers.
   */
  headers?: Record<string, string>;

  /**
   * Cookie persistence strategy for the guest ID.
   * @default 'forever'
   */
  persistence?: PersistenceOption;

  /**
   * Base URL prefix for API requests.
   * @default ''
   */
  baseUrl?: string;

  /**
   * Stale time in milliseconds before refetching on window focus.
   * @default 5000
   */
  staleTime?: number;
}

/**
 * Per-hook options for useBffState.
 */
export interface UseBffStateOptions {
  /**
   * Skip the initial fetch. Useful for conditional loading.
   * @default false
   */
  skip?: boolean;

  /**
   * Additional headers to include in requests for this hook.
   * These are merged with provider-level headers.
   */
  headers?: Record<string, string>;

  /**
   * Refetch when the window/tab becomes visible again.
   * @default true
   */
  refetchOnWindowFocus?: boolean;
}

/**
 * Return type for the useBffState hook.
 */
export interface UseBffStateResult<T> {
  /**
   * Current state value.
   * Returns the initial value until the first fetch completes.
   */
  data: T;

  /**
   * True during any loading operation (initial fetch or update).
   */
  loading: boolean;

  /**
   * Error from the last operation, or null if no error.
   */
  error: Error | null;

  /**
   * Update the state on the server.
   * Accepts either a new value or a function that receives the current value.
   */
  update: (newState: T | ((prev: T) => T)) => Promise<void>;

  /**
   * Manually refetch the state from the server.
   */
  refetch: () => Promise<void>;

  /**
   * True before the first fetch has started.
   */
  isUninitialized: boolean;

  /**
   * True during a refetch (data is still available from previous fetch).
   */
  isFetching: boolean;

  /**
   * True during an update operation.
   */
  isUpdating: boolean;
}

/**
 * Internal context value type.
 */
export interface BffStateContextValue {
  options: Required<BffStateProviderOptions>;
  getGuestId: () => string;
}
