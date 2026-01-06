import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, TestBaseElement, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

describe('createStoreAttachMixin', () => {
  it('exposes store property (initially null without context)', async () => {
    const { StoreAttachMixin } = createLitTestStore();
    const tagName = uniqueTag('test-attach-standalone');

    class TestElement extends StoreAttachMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    // Without a context provider ancestor, store is null
    expect(el.store).toBeNull();
  });

  it('can be applied to TestBaseElement', () => {
    const { StoreAttachMixin } = createLitTestStore();

    class MixedElement extends StoreAttachMixin(TestBaseElement) {}

    expect(MixedElement.prototype).toBeInstanceOf(TestBaseElement);
  });
});
