import { useMemo, type ReactNode } from 'react';
import { BffStateContext, defaultOptions } from './context';
import { createGuestIdManager } from '../core/cookie';
import type { BffStateProviderOptions, BffStateContextValue } from '../core/types';

export interface BffStateProviderProps {
  /**
   * Configuration options for the provider.
   */
  options?: BffStateProviderOptions;

  /**
   * Child components.
   */
  children: ReactNode;
}

/**
 * Provider component that wraps your app and provides BffState configuration.
 *
 * @example
 * ```tsx
 * <BffStateProvider options={{
 *   headers: { 'X-Custom': 'value' },
 *   persistence: { days: 30 },
 *   baseUrl: '/api',
 * }}>
 *   <App />
 * </BffStateProvider>
 * ```
 */
export function BffStateProvider({
  options = {},
  children,
}: BffStateProviderProps): JSX.Element {
  const contextValue = useMemo<BffStateContextValue>(() => {
    const mergedOptions: Required<BffStateProviderOptions> = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    const guestIdManager = createGuestIdManager(mergedOptions.persistence);

    return {
      options: mergedOptions,
      getGuestId: guestIdManager.getGuestId,
    };
  }, [
    options.headers,
    options.persistence,
    options.baseUrl,
    options.staleTime,
  ]);

  return (
    <BffStateContext.Provider value={contextValue}>
      {children}
    </BffStateContext.Provider>
  );
}
