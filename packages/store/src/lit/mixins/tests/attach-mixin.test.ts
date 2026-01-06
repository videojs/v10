import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

describe('createStoreAttachMixin', () => {
  it('exposes store property (initially null without context)', () => {
    const { StoreAttachMixin } = createLitTestStore();
    const tagName = uniqueTag('test-attach-standalone');

    const TestElement = StoreAttachMixin(HTMLElement);
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
    document.body.appendChild(el);

    // Without a context provider ancestor, store is null
    expect(el.store).toBeNull();
  });

  it('can be applied to HTMLElement', () => {
    const { StoreAttachMixin } = createLitTestStore();

    const MixedElement = StoreAttachMixin(HTMLElement);

    expect(MixedElement.prototype).toBeInstanceOf(HTMLElement);
  });
});
