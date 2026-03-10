import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { BffStateProvider } from '../src/react/BffStateProvider';
import { useBffState } from '../src/react/useBffState';

// Mock fetch globally
const mockFetch = vi.fn();

function createWrapper(
  options = {}
): ({ children }: { children: ReactNode }) => JSX.Element {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BffStateProvider options={options}>{children}</BffStateProvider>
    );
  };
}

describe('useBffState', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    // Clear cookies
    document.cookie = 'bff-guest-id=; max-age=0';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('returns initial value before fetch completes', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] }),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toEqual({ items: [] });
      expect(result.current.isUninitialized).toBe(true);

      // Clean up by resolving the pending promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ items: ['from-server'] }),
        });
      });
    });

    it('has loading true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] }),
        { wrapper: createWrapper() }
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      // Clean up by resolving the pending promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ items: ['from-server'] }),
        });
      });
    });
  });

  describe('fetching data', () => {
    it('fetches data on mount', async () => {
      const serverData = { items: ['from-server'] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(serverData),
      });

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(serverData);
      expect(result.current.isUninitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('includes guest ID in request URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      renderHook(() => useBffState('/api/cart', { items: [] }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\?_bffGuestId=[a-f0-9-]+$/);
    });

    it('uses baseUrl from provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      renderHook(() => useBffState('/api/cart', { items: [] }), {
        wrapper: createWrapper({ baseUrl: '/v1' }),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(/^\/v1\/api\/cart/);
    });

    it('merges headers from provider and hook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      renderHook(
        () =>
          useBffState('/api/cart', { items: [] }, { headers: { 'X-Hook': 'value' } }),
        {
          wrapper: createWrapper({ headers: { 'X-Provider': 'value' } }),
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Provider': 'value',
        'X-Hook': 'value',
      });
    });

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.message).toContain('Failed to fetch state');
      expect(result.current.data).toEqual({ items: [] }); // Still initial value
    });
  });

  describe('skip option', () => {
    it('does not fetch when skip is true', async () => {
      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] }, { skip: true }),
        { wrapper: createWrapper() }
      );

      // Wait a bit to ensure no fetch is made
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isUninitialized).toBe(true);
      expect(result.current.data).toEqual({ items: [] });
    });
  });

  describe('update', () => {
    it('updates state with new value', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a'] }),
      });

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] as string[] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a', 'b'] }),
      });

      await act(async () => {
        await result.current.update({ items: ['a', 'b'] });
      });

      expect(result.current.data).toEqual({ items: ['a', 'b'] });
    });

    it('updates state with function', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 }),
      });

      const { result } = renderHook(
        () => useBffState('/api/counter', { count: 0 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update with function
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 6 }),
      });

      await act(async () => {
        await result.current.update((prev) => ({ count: prev.count + 1 }));
      });

      // Check that POST was called with the correct body
      const [, options] = mockFetch.mock.calls[1];
      expect(JSON.parse(options.body)).toEqual({ count: 6 });
    });

    it('sets isUpdating during update', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] as string[] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Setup slow update
      let resolveUpdate: (value: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      // Start update
      let updatePromise: Promise<void>;
      act(() => {
        updatePromise = result.current.update({ items: ['new'] });
      });

      // Check isUpdating is true
      expect(result.current.isUpdating).toBe(true);
      expect(result.current.loading).toBe(true);

      // Complete update
      await act(async () => {
        resolveUpdate!({
          ok: true,
          json: () => Promise.resolve({ items: ['new'] }),
        });
        await updatePromise;
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('handles update error', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] as string[] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Failed update
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid data'),
      });

      await act(async () => {
        try {
          await result.current.update({ items: ['bad'] });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error?.message).toContain('Failed to update state');
      expect(result.current.data).toEqual({ items: [] }); // Still old value
    });
  });

  describe('refetch', () => {
    it('refetches data on demand', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a'] }),
      });

      const { result } = renderHook(
        () => useBffState('/api/cart', { items: [] as string[] }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ items: ['a'] });

      // Refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a', 'b'] }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual({ items: ['a', 'b'] });
    });
  });

  describe('visibility refetch', () => {
    it('refetches when tab becomes visible after stale time', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a'] }),
      });

      renderHook(
        () =>
          useBffState(
            '/api/cart',
            { items: [] as string[] },
            { refetchOnWindowFocus: true }
          ),
        {
          wrapper: createWrapper({ staleTime: 50 }),
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Wait for stale time
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      // Setup refetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a', 'b'] }),
      });

      // Trigger visibility change
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('does not refetch when refetchOnWindowFocus is false', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: ['a'] }),
      });

      renderHook(
        () =>
          useBffState(
            '/api/cart',
            { items: [] as string[] },
            { refetchOnWindowFocus: false }
          ),
        {
          wrapper: createWrapper({ staleTime: 0 }),
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Trigger visibility change
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        // Wait a bit
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should still be 1 call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('BffStateProvider', () => {
  it('throws error when useBffState is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBffState('/api/cart', { items: [] }));
    }).toThrow('useBffState must be used within a BffStateProvider');

    consoleError.mockRestore();
  });
});
