import { afterEach, describe, expect, it } from 'vitest';
import { GoogleCast } from '..';
import { requiresCastFramework } from '../utils';

const originalChromeDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'chrome');
const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userAgent');

afterEach(() => {
  if (originalChromeDescriptor) {
    Object.defineProperty(globalThis, 'chrome', originalChromeDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'chrome');
  }

  if (originalUserAgentDescriptor) {
    Object.defineProperty(globalThis.navigator, 'userAgent', originalUserAgentDescriptor);
  } else {
    Reflect.deleteProperty(globalThis.navigator, 'userAgent');
  }
});

describe('GoogleCast', () => {
  describe('supported', () => {
    it('returns false without chrome', () => {
      Reflect.deleteProperty(globalThis, 'chrome');

      expect(requiresCastFramework()).toBe(false);
      expect(createGoogleCast().supported).toBe(false);
    });

    it('returns true on non-Android Chrome', () => {
      setChrome();
      setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

      expect(requiresCastFramework()).toBe(true);
      expect(createGoogleCast().supported).toBe(true);
    });

    it('returns false on Android Chrome 56 and newer', () => {
      setChrome();
      setUserAgent('Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 Chrome/56.0.2924.87 Mobile Safari/537.36');

      expect(requiresCastFramework()).toBe(false);
      expect(createGoogleCast().supported).toBe(false);
    });
  });

  describe('receiver', () => {
    it('stores a non-empty string value', () => {
      const cast = createGoogleCast();
      cast.receiver = 'ABC123';
      expect(cast.receiver).toBe('ABC123');
    });

    it('coerces empty string to the default receiver', () => {
      const cast = createGoogleCast();
      cast.receiver = 'ABC123';
      cast.receiver = '';
      expect(cast.receiver).toBe('CC1AD845');
    });

    it('stores the default receiver when set to undefined', () => {
      const cast = createGoogleCast();
      cast.receiver = 'ABC123';
      cast.receiver = undefined;
      expect(cast.receiver).toBe('CC1AD845');
    });

    it('updates the castOptions receiverApplicationId when set', () => {
      const cast = createGoogleCast();
      cast.receiver = 'ABC123';
      expect(cast.options.receiverApplicationId).toBe('ABC123');
    });

    it('resets receiverApplicationId to the default receiver when cleared', () => {
      const cast = createGoogleCast();
      cast.receiver = 'ABC123';
      cast.receiver = '';
      expect(cast.options.receiverApplicationId).toBe('CC1AD845');
    });
  });

  describe('contentType', () => {
    it('stores a non-empty string value', () => {
      const cast = createGoogleCast();
      cast.contentType = 'application/x-mpegURL';
      expect(cast.contentType).toBe('application/x-mpegURL');
    });

    it('coerces empty string to undefined', () => {
      const cast = createGoogleCast();
      cast.contentType = 'application/x-mpegURL';
      cast.contentType = '';
      expect(cast.contentType).toBeUndefined();
    });

    it('stores undefined when set to undefined', () => {
      const cast = createGoogleCast();
      cast.contentType = 'application/x-mpegURL';
      cast.contentType = undefined;
      expect(cast.contentType).toBeUndefined();
    });
  });

  describe('src', () => {
    it('stores a non-empty string value', () => {
      const cast = createGoogleCast();
      cast.src = 'https://example.com/cast.m3u8';
      expect(cast.src).toBe('https://example.com/cast.m3u8');
    });

    it('coerces empty string to an empty getter value without local media fallback', () => {
      const cast = createGoogleCast();
      cast.src = 'https://example.com/cast.m3u8';
      cast.src = '';
      expect(cast.src).toBe('');
    });
  });
});

function createGoogleCast() {
  return new GoogleCast();
}

function setChrome() {
  Object.defineProperty(globalThis, 'chrome', { value: {}, configurable: true });
}

function setUserAgent(value: string) {
  Object.defineProperty(globalThis.navigator, 'userAgent', { value, configurable: true });
}
