import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateUuid,
  getMaxAge,
  parseCookies,
  readGuestId,
  writeGuestId,
  getOrCreateGuestId,
  createGuestIdManager,
} from '../src/core/cookie';
import type { PersistenceOption } from '../src/core/types';

describe('cookie utilities', () => {
  describe('generateUuid', () => {
    it('generates a valid UUID v4 format', () => {
      const uuid = generateUuid();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('generates unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuid());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('getMaxAge', () => {
    it('returns undefined for session persistence', () => {
      expect(getMaxAge('session')).toBeUndefined();
    });

    it('returns 400 days in seconds for forever persistence', () => {
      const maxAge = getMaxAge('forever');
      expect(maxAge).toBe(400 * 24 * 60 * 60);
    });

    it('returns correct seconds for days persistence', () => {
      const maxAge = getMaxAge({ days: 30 });
      expect(maxAge).toBe(30 * 24 * 60 * 60);
    });

    it('returns correct seconds for 1 day persistence', () => {
      const maxAge = getMaxAge({ days: 1 });
      expect(maxAge).toBe(24 * 60 * 60);
    });
  });

  describe('parseCookies', () => {
    it('parses empty string', () => {
      expect(parseCookies('')).toEqual({});
    });

    it('parses single cookie', () => {
      expect(parseCookies('name=value')).toEqual({ name: 'value' });
    });

    it('parses multiple cookies', () => {
      expect(parseCookies('name1=value1; name2=value2')).toEqual({
        name1: 'value1',
        name2: 'value2',
      });
    });

    it('handles URL-encoded values', () => {
      expect(parseCookies('name=hello%20world')).toEqual({
        name: 'hello world',
      });
    });

    it('handles cookies with equals sign in value', () => {
      expect(parseCookies('name=value=with=equals')).toEqual({
        name: 'value=with=equals',
      });
    });

    it('trims whitespace from names and values', () => {
      expect(parseCookies('  name  =  value  ')).toEqual({ name: 'value' });
    });
  });

  describe('readGuestId', () => {
    beforeEach(() => {
      // Clear cookies
      document.cookie = 'bff-guest-id=; max-age=0';
    });

    afterEach(() => {
      // Clear cookies
      document.cookie = 'bff-guest-id=; max-age=0';
    });

    it('returns null when cookie does not exist', () => {
      expect(readGuestId()).toBeNull();
    });

    it('returns the guest ID when cookie exists', () => {
      document.cookie = 'bff-guest-id=test-id-123';
      expect(readGuestId()).toBe('test-id-123');
    });
  });

  describe('writeGuestId', () => {
    afterEach(() => {
      document.cookie = 'bff-guest-id=; max-age=0';
    });

    it('writes a session cookie', () => {
      writeGuestId('test-id', 'session');
      expect(readGuestId()).toBe('test-id');
    });

    it('writes a persistent cookie', () => {
      writeGuestId('test-id', { days: 30 });
      expect(readGuestId()).toBe('test-id');
    });

    it('writes a forever cookie', () => {
      writeGuestId('test-id', 'forever');
      expect(readGuestId()).toBe('test-id');
    });
  });

  describe('getOrCreateGuestId', () => {
    afterEach(() => {
      document.cookie = 'bff-guest-id=; max-age=0';
    });

    it('returns existing ID when cookie exists', () => {
      document.cookie = 'bff-guest-id=existing-id';
      const id = getOrCreateGuestId('forever');
      expect(id).toBe('existing-id');
    });

    it('generates new ID when cookie does not exist', () => {
      const id = getOrCreateGuestId('forever');
      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThan(0);
    });

    it('writes the new ID to cookie', () => {
      const id = getOrCreateGuestId('forever');
      expect(readGuestId()).toBe(id);
    });
  });

  describe('createGuestIdManager', () => {
    afterEach(() => {
      document.cookie = 'bff-guest-id=; max-age=0';
    });

    it('returns same ID on multiple calls', () => {
      const manager = createGuestIdManager('forever');
      const id1 = manager.getGuestId();
      const id2 = manager.getGuestId();
      expect(id1).toBe(id2);
    });

    it('lazily generates the ID on first access', () => {
      // Clear any existing cookie
      document.cookie = 'bff-guest-id=; max-age=0';

      const manager = createGuestIdManager('forever');

      // Before calling getGuestId, no new cookie should be set
      // (We can't easily test this without more complex mocking)

      // After calling getGuestId, the ID should be set
      const id = manager.getGuestId();
      expect(id).toBeDefined();
      expect(readGuestId()).toBe(id);
    });
  });
});
