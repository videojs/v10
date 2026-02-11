import { describe, expect, it } from 'vitest';
import { AbortControllerRegistry } from '../abort-controller-registry';

describe('AbortControllerRegistry', () => {
  describe('base', () => {
    it('returns an AbortSignal', () => {
      const signals = new AbortControllerRegistry();
      expect(signals.base).toBeInstanceOf(AbortSignal);
    });

    it('is not aborted initially', () => {
      const signals = new AbortControllerRegistry();
      expect(signals.base.aborted).toBe(false);
    });

    it('is aborted after reset()', () => {
      const signals = new AbortControllerRegistry();
      const base = signals.base;

      signals.reset();

      expect(base.aborted).toBe(true);
    });

    it('returns new signal after reset()', () => {
      const signals = new AbortControllerRegistry();
      const base1 = signals.base;

      signals.reset();

      const base2 = signals.base;
      expect(base1).not.toBe(base2);
      expect(base2.aborted).toBe(false);
    });

    it('is not aborted after clear()', () => {
      const signals = new AbortControllerRegistry();
      const base = signals.base;

      signals.clear();

      expect(base.aborted).toBe(false);
    });
  });

  describe('clear', () => {
    it('aborts keyed signals', () => {
      const signals = new AbortControllerRegistry();
      const signal = signals.supersede('test');

      signals.clear();

      expect(signal.aborted).toBe(true);
    });

    it('does not abort base', () => {
      const signals = new AbortControllerRegistry();
      const base = signals.base;
      signals.supersede('test');

      signals.clear();

      expect(base.aborted).toBe(false);
    });

    it('clears all keyed signals', () => {
      const signals = new AbortControllerRegistry();
      const signal1 = signals.supersede('key1');
      const signal2 = signals.supersede('key2');

      signals.clear();

      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(true);
    });
  });

  describe('reset', () => {
    it('aborts base signal', () => {
      const signals = new AbortControllerRegistry();
      const base = signals.base;

      signals.reset();

      expect(base.aborted).toBe(true);
    });

    it('aborts keyed signals', () => {
      const signals = new AbortControllerRegistry();
      const signal = signals.supersede('test');

      signals.reset();

      expect(signal.aborted).toBe(true);
    });

    it('creates new base signal', () => {
      const signals = new AbortControllerRegistry();
      const base1 = signals.base;

      signals.reset();

      const base2 = signals.base;
      expect(base1).not.toBe(base2);
      expect(base2.aborted).toBe(false);
    });
  });

  describe('supersede', () => {
    it('returns an AbortSignal', () => {
      const signals = new AbortControllerRegistry();
      const signal = signals.supersede('test');

      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it('is not aborted initially', () => {
      const signals = new AbortControllerRegistry();
      const signal = signals.supersede('test');

      expect(signal.aborted).toBe(false);
    });

    it('aborts when base is reset', () => {
      const signals = new AbortControllerRegistry();
      const signal = signals.supersede('test');

      signals.reset();

      expect(signal.aborted).toBe(true);
    });

    it('aborts previous signal for same key', () => {
      const signals = new AbortControllerRegistry();
      const signal1 = signals.supersede('seek');

      const signal2 = signals.supersede('seek');

      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(false);
    });

    it('does not abort signals with different keys', () => {
      const signals = new AbortControllerRegistry();
      const signal1 = signals.supersede('key1');
      const signal2 = signals.supersede('key2');

      expect(signal1.aborted).toBe(false);
      expect(signal2.aborted).toBe(false);
    });

    it('supports symbol keys', () => {
      const signals = new AbortControllerRegistry();
      const key = Symbol('test');
      const signal1 = signals.supersede(key);
      const signal2 = signals.supersede(key);

      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(false);
    });

    it('allows reusing key after clear()', () => {
      const signals = new AbortControllerRegistry();
      const signal1 = signals.supersede('test');

      signals.clear();

      const signal2 = signals.supersede('test');
      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(false);
    });
  });
});
