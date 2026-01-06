import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

describe('createStoreProviderMixin', () => {
  it('creates store lazily on first access', () => {
    const { StoreProviderMixin } = createLitTestStore();
    const tagName = uniqueTag('test-provider');

    const TestElement = StoreProviderMixin(HTMLElement);
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
    document.body.appendChild(el);

    expect(el.store).toBeDefined();
    expect(el.store.state).toEqual({ volume: 1, muted: false });
  });

  it('reuses same store instance', () => {
    const { StoreProviderMixin } = createLitTestStore();
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
    const { StoreProviderMixin } = createLitTestStore();
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
    const { StoreProviderMixin, create } = createLitTestStore();
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
    const { StoreProviderMixin, create } = createLitTestStore();
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
    const { StoreProviderMixin, create } = createLitTestStore();
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
