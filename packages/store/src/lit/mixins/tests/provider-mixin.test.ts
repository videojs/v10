import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, TestBaseElement, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

describe('createProviderMixin', () => {
  it('creates store lazily on first access', async () => {
    const { ProviderMixin } = createLitTestStore();
    const tagName = uniqueTag('test-provider');

    class TestElement extends ProviderMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.store).toBeDefined();
    expect(el.store.state).toEqual({ volume: 1, muted: false });
  });

  it('reuses same store instance', async () => {
    const { ProviderMixin } = createLitTestStore();
    const tagName = uniqueTag('test-provider-reuse');

    class TestElement extends ProviderMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    const first = el.store;
    const second = el.store;

    expect(first).toBe(second);
  });

  it('destroys owned store on disconnect', async () => {
    const { ProviderMixin } = createLitTestStore();
    const tagName = uniqueTag('test-provider-destroy');

    class TestElement extends ProviderMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    const store = el.store;
    expect(store.destroyed).toBe(false);

    el.remove();

    expect(store.destroyed).toBe(true);
  });

  it('allows setting custom store via setter', async () => {
    const { ProviderMixin, create } = createLitTestStore();
    const tagName = uniqueTag('test-provider-setter');

    class TestElement extends ProviderMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    const customStore = create();
    el.store = customStore;

    expect(el.store).toBe(customStore);
  });

  it('does not destroy externally provided store on disconnect', async () => {
    const { ProviderMixin, create } = createLitTestStore();
    const tagName = uniqueTag('test-provider-external');

    class TestElement extends ProviderMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    const externalStore = create();
    el.store = externalStore;
    document.body.appendChild(el);
    await el.updateComplete;

    el.remove();

    // External store should NOT be destroyed
    expect(externalStore.destroyed).toBe(false);
  });

  it('destroys old owned store when setting new store', async () => {
    const { ProviderMixin, create } = createLitTestStore();
    const tagName = uniqueTag('test-provider-replace');

    class TestElement extends ProviderMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    const ownedStore = el.store; // Creates owned store
    const newStore = create();
    el.store = newStore;

    // Owned store should be destroyed
    expect(ownedStore.destroyed).toBe(true);
    expect(newStore.destroyed).toBe(false);
  });
});
