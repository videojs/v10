import { describe, expect, it } from 'vitest';

import { createFeature } from '../../core/feature';
import { createStore } from '../create-store';
import { TestBaseElement } from './test-utils';

describe('createStore', () => {
  // Mock target
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
  }

  const audioFeature = createFeature<MockMedia>()({
    initialState: { volume: 1, muted: false },
    getSnapshot: ({ target }) => ({
      volume: target.volume,
      muted: target.muted,
    }),
    subscribe: ({ target, update, signal }) => {
      const handler = () => update();
      target.addEventListener('volumechange', handler);
      signal.addEventListener('abort', () => {
        target.removeEventListener('volumechange', handler);
      });
    },
    request: {
      setVolume: (volume: number, { target }) => {
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
    },
  });

  describe('create', () => {
    it('creates a store instance', () => {
      const { create } = createStore({ features: [audioFeature] });

      const store = create();

      expect(store).toBeDefined();
      expect(store.state).toEqual({ volume: 1, muted: false });
    });

    it('creates independent store instances', () => {
      const { create } = createStore({ features: [audioFeature] });

      const store1 = create();
      const store2 = create();

      expect(store1).not.toBe(store2);
    });
  });

  describe('context', () => {
    it('contexts share the same key for interoperability', () => {
      const result1 = createStore({ features: [audioFeature] });
      const result2 = createStore({ features: [audioFeature] });

      // Contexts use a shared key so different store configurations can interoperate
      expect(result1.context).toBe(result2.context);
    });

    it('context is defined', () => {
      const { context } = createStore({ features: [audioFeature] });

      expect(context).toBeDefined();
    });
  });

  describe('mixins', () => {
    it('returns StoreMixin', () => {
      const { StoreMixin } = createStore({ features: [audioFeature] });

      expect(typeof StoreMixin).toBe('function');
    });

    it('returns ProviderMixin', () => {
      const { ProviderMixin } = createStore({ features: [audioFeature] });

      expect(typeof ProviderMixin).toBe('function');
    });

    it('returns ContainerMixin', () => {
      const { ContainerMixin } = createStore({ features: [audioFeature] });

      expect(typeof ContainerMixin).toBe('function');
    });

    it('mixins can be applied to TestBaseElement', () => {
      const { StoreMixin, ProviderMixin, ContainerMixin } = createStore({
        features: [audioFeature],
      });

      const Mixed1 = StoreMixin(TestBaseElement);
      const Mixed2 = ProviderMixin(TestBaseElement);
      const Mixed3 = ContainerMixin(TestBaseElement);

      expect(Mixed1.prototype).toBeInstanceOf(TestBaseElement);
      expect(Mixed2.prototype).toBeInstanceOf(TestBaseElement);
      expect(Mixed3.prototype).toBeInstanceOf(TestBaseElement);
    });
  });

  describe('result object', () => {
    it('returns all expected properties', () => {
      const result = createStore({ features: [audioFeature] });

      expect(result).toHaveProperty('StoreMixin');
      expect(result).toHaveProperty('ProviderMixin');
      expect(result).toHaveProperty('ContainerMixin');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('create');
      expect(result).toHaveProperty('StoreController');
    });
  });

  describe('bound controllers', () => {
    it('StoreController is a class', () => {
      const { StoreController } = createStore({ features: [audioFeature] });

      expect(typeof StoreController).toBe('function');
      expect(StoreController.prototype).toBeDefined();
    });

    // Note: Full integration tests with DOM and context would require
    // setting up a provider element hierarchy. The bound controllers
    // work via context, which is tested in integration tests.
  });
});
