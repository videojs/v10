import { describe, expect, it } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore } from '../create-store';
import { TestBaseElement } from './test-utils';

describe('createStore', () => {
  // Mock target
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
  }

  const audioSlice = createSlice<MockMedia>()({
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
      const { create } = createStore({ slices: [audioSlice] });

      const store = create();

      expect(store).toBeDefined();
      expect(store.state).toEqual({ volume: 1, muted: false });
    });

    it('creates independent store instances', () => {
      const { create } = createStore({ slices: [audioSlice] });

      const store1 = create();
      const store2 = create();

      expect(store1).not.toBe(store2);
    });
  });

  describe('context', () => {
    it('contexts share the same key for interoperability', () => {
      const result1 = createStore({ slices: [audioSlice] });
      const result2 = createStore({ slices: [audioSlice] });

      // Contexts use a shared key so different store configurations can interoperate
      expect(result1.context).toBe(result2.context);
    });

    it('context is defined', () => {
      const { context } = createStore({ slices: [audioSlice] });

      expect(context).toBeDefined();
    });
  });

  describe('mixins', () => {
    it('returns StoreMixin', () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });

      expect(typeof StoreMixin).toBe('function');
    });

    it('returns StoreProviderMixin', () => {
      const { StoreProviderMixin } = createStore({ slices: [audioSlice] });

      expect(typeof StoreProviderMixin).toBe('function');
    });

    it('returns StoreAttachMixin', () => {
      const { StoreAttachMixin } = createStore({ slices: [audioSlice] });

      expect(typeof StoreAttachMixin).toBe('function');
    });

    it('mixins can be applied to TestBaseElement', () => {
      const { StoreMixin, StoreProviderMixin, StoreAttachMixin } = createStore({ slices: [audioSlice] });

      const Mixed1 = StoreMixin(TestBaseElement);
      const Mixed2 = StoreProviderMixin(TestBaseElement);
      const Mixed3 = StoreAttachMixin(TestBaseElement);

      expect(Mixed1.prototype).toBeInstanceOf(TestBaseElement);
      expect(Mixed2.prototype).toBeInstanceOf(TestBaseElement);
      expect(Mixed3.prototype).toBeInstanceOf(TestBaseElement);
    });
  });

  describe('result object', () => {
    it('returns all expected properties', () => {
      const result = createStore({ slices: [audioSlice] });

      expect(result).toHaveProperty('StoreMixin');
      expect(result).toHaveProperty('StoreProviderMixin');
      expect(result).toHaveProperty('StoreAttachMixin');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('create');
      expect(result).toHaveProperty('StateController');
      expect(result).toHaveProperty('RequestController');
      expect(result).toHaveProperty('TasksController');
    });
  });

  describe('bound controllers', () => {
    it('StateController is a class', () => {
      const { StateController } = createStore({ slices: [audioSlice] });

      expect(typeof StateController).toBe('function');
      expect(StateController.prototype).toBeDefined();
    });

    it('RequestController is a class', () => {
      const { RequestController } = createStore({ slices: [audioSlice] });

      expect(typeof RequestController).toBe('function');
      expect(RequestController.prototype).toBeDefined();
    });

    it('TasksController is a class', () => {
      const { TasksController } = createStore({ slices: [audioSlice] });

      expect(typeof TasksController).toBe('function');
      expect(TasksController.prototype).toBeDefined();
    });

    // Note: Full integration tests with DOM and context would require
    // setting up a provider element hierarchy. The bound controllers
    // work via context, which is tested in integration tests.
  });
});
