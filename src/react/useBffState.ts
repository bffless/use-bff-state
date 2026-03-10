import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBffStateContext } from './context';
import { fetchState, updateState, mergeHeaders } from '../core/client';
import type { UseBffStateOptions, UseBffStateResult } from '../core/types';

/**
 * React hook for managing server-side state with BFFless.
 *
 * @param path - The API endpoint path (e.g., '/api/cart')
 * @param initialValue - The initial value before data is fetched
 * @param options - Optional configuration for this hook
 * @returns An object with state data and methods
 *
 * @example
 * ```tsx
 * const { data, loading, error, update } = useBffState('/api/cart', { items: [] });
 *
 * // Update with new value
 * update({ items: [...data.items, newItem] });
 *
 * // Update with function
 * update(prev => ({ ...prev, count: prev.count + 1 }));
 * ```
 */
export function useBffState<T>(
  path: string,
  initialValue: T,
  options: UseBffStateOptions = {}
): UseBffStateResult<T> {
  const { skip = false, headers: hookHeaders, refetchOnWindowFocus = true } = options;

  const context = useBffStateContext();
  const { options: providerOptions, getGuestId } = context;

  // State
  const [data, setData] = useState<T>(initialValue);
  const [error, setError] = useState<Error | null>(null);
  const [isUninitialized, setIsUninitialized] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Track the last fetch time for stale checking
  const lastFetchTimeRef = useRef<number>(0);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Store the current data in a ref for update function to avoid stale closure
  const dataRef = useRef(data);
  dataRef.current = data;

  // Memoize headers to prevent unnecessary re-renders
  const mergedHeaders = useMemo(
    () => mergeHeaders(providerOptions.headers, hookHeaders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(providerOptions.headers), JSON.stringify(hookHeaders)]
  );

  // Store the current AbortController for the fetch
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetches the current state from the server.
   */
  const doFetch = useCallback(async (signal?: AbortSignal) => {
    if (!isMountedRef.current) return;

    setIsFetching(true);
    setError(null);

    try {
      const result = await fetchState<T>(path, {
        guestId: getGuestId(),
        headers: mergedHeaders,
        baseUrl: providerOptions.baseUrl,
        signal,
      });

      if (isMountedRef.current) {
        setData(result);
        setIsUninitialized(false);
        lastFetchTimeRef.current = Date.now();
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [path, getGuestId, mergedHeaders, providerOptions.baseUrl]);

  /**
   * Manually refetch the state from the server.
   */
  const refetch = useCallback(async () => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    await doFetch(abortControllerRef.current.signal);
  }, [doFetch]);

  /**
   * Updates the state on the server.
   */
  const update = useCallback(
    async (newState: T | ((prev: T) => T)) => {
      if (!isMountedRef.current) return;

      setIsUpdating(true);
      setError(null);

      try {
        // Resolve the new state value using ref to get current data
        const resolvedState =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(dataRef.current)
            : newState;

        const result = await updateState<T>(path, resolvedState, {
          guestId: getGuestId(),
          headers: mergedHeaders,
          baseUrl: providerOptions.baseUrl,
        });

        if (isMountedRef.current) {
          setData(result);
          lastFetchTimeRef.current = Date.now();
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsUpdating(false);
        }
      }
    },
    [path, getGuestId, mergedHeaders, providerOptions.baseUrl]
  );

  // Initial fetch on mount (unless skipped)
  useEffect(() => {
    isMountedRef.current = true;

    if (!skip) {
      // Abort any previous request and create a new controller
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      doFetch(abortControllerRef.current.signal);
    }

    return () => {
      isMountedRef.current = false;
      // Abort in-flight request on unmount
      abortControllerRef.current?.abort();
    };
    // Only run on mount and when skip changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  // Visibility change handler for refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (skip) return;

      // Check if data is stale
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > providerOptions.staleTime) {
        doFetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchOnWindowFocus, skip, doFetch, providerOptions.staleTime]);

  return {
    data,
    loading: isFetching || isUpdating,
    error,
    update,
    refetch,
    isUninitialized,
    isFetching,
    isUpdating,
  };
}
