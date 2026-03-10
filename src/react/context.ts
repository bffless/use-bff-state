import { createContext, useContext } from 'react';
import type { BffStateContextValue, BffStateProviderOptions } from '../core/types';

/**
 * Default provider options.
 */
export const defaultOptions: Required<BffStateProviderOptions> = {
  headers: {},
  persistence: 'forever',
  baseUrl: '',
  staleTime: 5000,
};

/**
 * React context for BffState configuration.
 */
export const BffStateContext = createContext<BffStateContextValue | null>(null);

/**
 * Hook to access the BffState context.
 * Throws an error if used outside of a BffStateProvider.
 */
export function useBffStateContext(): BffStateContextValue {
  const context = useContext(BffStateContext);

  if (context === null) {
    throw new Error(
      'useBffState must be used within a BffStateProvider. ' +
        'Wrap your app with <BffStateProvider> to use this hook.'
    );
  }

  return context;
}
