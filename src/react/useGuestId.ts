import { useBffStateContext } from './context';

/**
 * React hook that returns the current guest ID.
 * Must be used within a BffStateProvider.
 *
 * @example
 * ```tsx
 * const guestId = useGuestId();
 * ```
 */
export function useGuestId(): string {
  const { getGuestId } = useBffStateContext();
  return getGuestId();
}
