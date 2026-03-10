import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  appendGuestIdParam,
  buildUrl,
  mergeHeaders,
  fetchState,
  updateState,
} from '../src/core/client';

describe('client utilities', () => {
  describe('appendGuestIdParam', () => {
    it('appends to URL without query params', () => {
      const result = appendGuestIdParam('/api/cart', 'abc-123');
      expect(result).toBe('/api/cart?_bffGuestId=abc-123');
    });

    it('appends to URL with existing query params', () => {
      const result = appendGuestIdParam('/api/cart?page=1', 'abc-123');
      expect(result).toBe('/api/cart?page=1&_bffGuestId=abc-123');
    });

    it('encodes special characters in guest ID', () => {
      const result = appendGuestIdParam('/api/cart', 'id with spaces');
      expect(result).toBe('/api/cart?_bffGuestId=id%20with%20spaces');
    });
  });

  describe('buildUrl', () => {
    it('returns path as-is when no baseUrl', () => {
      expect(buildUrl('/api/cart', '')).toBe('/api/cart');
    });

    it('combines baseUrl and path', () => {
      expect(buildUrl('/api/cart', '/v1')).toBe('/v1/api/cart');
    });

    it('handles baseUrl with trailing slash', () => {
      expect(buildUrl('/api/cart', '/v1/')).toBe('/v1/api/cart');
    });

    it('handles path without leading slash', () => {
      expect(buildUrl('api/cart', '/v1')).toBe('/v1/api/cart');
    });

    it('returns absolute URLs unchanged', () => {
      expect(buildUrl('https://example.com/api/cart', '/v1')).toBe(
        'https://example.com/api/cart'
      );
      expect(buildUrl('http://example.com/api/cart', '/v1')).toBe(
        'http://example.com/api/cart'
      );
    });
  });

  describe('mergeHeaders', () => {
    it('returns empty object for no arguments', () => {
      expect(mergeHeaders()).toEqual({});
    });

    it('returns empty object for undefined arguments', () => {
      expect(mergeHeaders(undefined, undefined)).toEqual({});
    });

    it('merges single header object', () => {
      expect(mergeHeaders({ 'X-Custom': 'value' })).toEqual({
        'X-Custom': 'value',
      });
    });

    it('merges multiple header objects', () => {
      expect(
        mergeHeaders({ 'X-Header1': 'value1' }, { 'X-Header2': 'value2' })
      ).toEqual({
        'X-Header1': 'value1',
        'X-Header2': 'value2',
      });
    });

    it('later objects override earlier ones', () => {
      expect(
        mergeHeaders({ 'X-Header': 'first' }, { 'X-Header': 'second' })
      ).toEqual({
        'X-Header': 'second',
      });
    });

    it('handles mix of defined and undefined', () => {
      expect(
        mergeHeaders({ 'X-Header1': 'value1' }, undefined, {
          'X-Header2': 'value2',
        })
      ).toEqual({
        'X-Header1': 'value1',
        'X-Header2': 'value2',
      });
    });
  });

  describe('fetchState', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch);
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('makes GET request with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetchState('/api/cart', {
        guestId: 'abc-123',
        headers: { 'X-Custom': 'value' },
        baseUrl: '/v1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/v1/api/cart?_bffGuestId=abc-123',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          },
          credentials: 'include',
        }
      );
    });

    it('returns parsed JSON response', async () => {
      const expectedData = { items: ['a', 'b', 'c'] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedData),
      });

      const result = await fetchState('/api/cart', {
        guestId: 'abc-123',
      });

      expect(result).toEqual(expectedData);
    });

    it('throws error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Resource not found'),
      });

      await expect(
        fetchState('/api/cart', { guestId: 'abc-123' })
      ).rejects.toThrow('Failed to fetch state: 404 Not Found - Resource not found');
    });
  });

  describe('updateState', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch);
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('makes POST request with correct URL, headers, and body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const data = { items: ['a', 'b'] };
      await updateState('/api/cart', data, {
        guestId: 'abc-123',
        headers: { 'X-Custom': 'value' },
        baseUrl: '/v1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/v1/api/cart?_bffGuestId=abc-123',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
    });

    it('returns parsed JSON response', async () => {
      const expectedData = { items: ['a', 'b', 'c'], updated: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedData),
      });

      const result = await updateState(
        '/api/cart',
        { items: ['a', 'b', 'c'] },
        { guestId: 'abc-123' }
      );

      expect(result).toEqual(expectedData);
    });

    it('throws error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(
        updateState('/api/cart', { items: [] }, { guestId: 'abc-123' })
      ).rejects.toThrow('Failed to update state: 500 Internal Server Error - Server error');
    });
  });
});
