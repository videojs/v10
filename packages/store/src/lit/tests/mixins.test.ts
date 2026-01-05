import { afterEach, describe, expect, it } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore } from '../create-store';

describe('lit mixins', () => {
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

  // Track defined elements to avoid duplicate registration
  let tagCounter = 0;
  function uniqueTag(base: string): string {
    return `${base}-${Date.now()}-${tagCounter++}`;
  }

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('storeProviderMixin', () => {
    it('creates store lazily on first access', () => {
      const { StoreProviderMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-provider');

      const TestElement = StoreProviderMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      document.body.appendChild(el);

      expect(el.store).toBeDefined();
      expect(el.store.state).toEqual({ volume: 1, muted: false });
    });

    it('reuses same store instance', () => {
      const { StoreProviderMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-provider-reuse');

      const TestElement = StoreProviderMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      document.body.appendChild(el);

      const first = el.store;
      const second = el.store;

      expect(first).toBe(second);
    });

    it('destroys owned store on disconnect', () => {
      const { StoreProviderMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-provider-destroy');

      const TestElement = StoreProviderMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      document.body.appendChild(el);

      const store = el.store;
      expect(store.destroyed).toBe(false);

      el.remove();

      expect(store.destroyed).toBe(true);
    });

    it('allows setting custom store via setter', () => {
      const { StoreProviderMixin, create } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-provider-setter');

      const TestElement = StoreProviderMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      document.body.appendChild(el);

      const customStore = create();
      el.store = customStore;

      expect(el.store).toBe(customStore);
    });

    it('does not destroy externally provided store on disconnect', () => {
      const { StoreProviderMixin, create } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-provider-external');

      const TestElement = StoreProviderMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      const externalStore = create();
      el.store = externalStore;
      document.body.appendChild(el);

      el.remove();

      // External store should NOT be destroyed
      expect(externalStore.destroyed).toBe(false);
    });

    it('destroys old owned store when setting new store', () => {
      const { StoreProviderMixin, create } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-provider-replace');

      const TestElement = StoreProviderMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      document.body.appendChild(el);

      const ownedStore = el.store; // Creates owned store
      const newStore = create();
      el.store = newStore;

      // Owned store should be destroyed
      expect(ownedStore.destroyed).toBe(true);
      expect(newStore.destroyed).toBe(false);
    });
  });

  describe('storeAttachMixin', () => {
    it('exposes store property (initially null without context)', () => {
      const { StoreAttachMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-attach-standalone');

      const TestElement = StoreAttachMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      document.body.appendChild(el);

      // Without a context provider ancestor, store is null
      expect(el.store).toBeNull();
    });

    it('can be applied to HTMLElement', () => {
      const { StoreAttachMixin } = createStore({ slices: [audioSlice] });

      const MixedElement = StoreAttachMixin(HTMLElement);

      expect(MixedElement.prototype).toBeInstanceOf(HTMLElement);
    });
  });

  describe('storeMixin (combined)', () => {
    it('provides store and attaches media', async () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-combined');

      const TestBase = StoreMixin(HTMLElement);
      class TestElement extends TestBase {
        connectedCallback() {
          // @ts-expect-error - connectedCallback exists at runtime
          super.connectedCallback?.();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      }
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as TestElement;
      document.body.appendChild(el);

      expect(el.store).toBeDefined();
      expect(el.store.state).toEqual({ volume: 1, muted: false });
    });

    it('auto-attaches slotted video element', async () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-auto-attach');

      const TestBase = StoreMixin(HTMLElement);
      class TestElement extends TestBase {
        connectedCallback() {
          // @ts-expect-error - connectedCallback exists at runtime
          super.connectedCallback?.();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      }
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as TestElement;
      const video = document.createElement('video');
      el.appendChild(video);
      document.body.appendChild(el);

      // Wait for slotchange
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(el.store.target).toBe(video);
    });

    it('auto-attaches light DOM video when no shadow root', async () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-light-dom');

      const TestElement = StoreMixin(HTMLElement);
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
      const video = document.createElement('video');
      el.appendChild(video);
      document.body.appendChild(el);

      // Wait for attachment
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(el.store.target).toBe(video);
    });

    it('finds nested video element', async () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-nested');

      const TestBase = StoreMixin(HTMLElement);
      class TestElement extends TestBase {
        connectedCallback() {
          // @ts-expect-error - connectedCallback exists at runtime
          super.connectedCallback?.();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      }
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as TestElement;
      const wrapper = document.createElement('div');
      const video = document.createElement('video');
      wrapper.appendChild(video);
      el.appendChild(wrapper);
      document.body.appendChild(el);

      // Wait for slotchange
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(el.store.target).toBe(video);
    });

    it('auto-attaches audio element', async () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-audio');

      const TestBase = StoreMixin(HTMLElement);
      class TestElement extends TestBase {
        connectedCallback() {
          // @ts-expect-error - connectedCallback exists at runtime
          super.connectedCallback?.();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      }
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as TestElement;
      const audio = document.createElement('audio');
      el.appendChild(audio);
      document.body.appendChild(el);

      // Wait for slotchange
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(el.store.target).toBe(audio);
    });

    it('attaches only the first media element when multiple exist', async () => {
      const { StoreMixin } = createStore({ slices: [audioSlice] });
      const tagName = uniqueTag('test-multiple-media');

      const TestBase = StoreMixin(HTMLElement);
      class TestElement extends TestBase {
        connectedCallback() {
          // @ts-expect-error - connectedCallback exists at runtime
          super.connectedCallback?.();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      }
      customElements.define(tagName, TestElement);

      const el = document.createElement(tagName) as TestElement;
      const video1 = document.createElement('video');
      const video2 = document.createElement('video');
      el.appendChild(video1);
      el.appendChild(video2);
      document.body.appendChild(el);

      // Wait for slotchange
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Should attach only the first one
      expect(el.store.target).toBe(video1);
    });
  });
});
