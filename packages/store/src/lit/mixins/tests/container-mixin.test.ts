import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, TestBaseElement, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

describe('createContainerMixin', () => {
  it('exposes store property (initially null without context)', async () => {
    const { ContainerMixin } = createLitTestStore();
    const tagName = uniqueTag('test-container-standalone');

    class TestElement extends ContainerMixin(TestBaseElement) {}
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    // Without a context provider ancestor, store is null
    expect(el.store).toBeNull();
  });

  it('can be applied to TestBaseElement', () => {
    const { ContainerMixin } = createLitTestStore();

    class MixedElement extends ContainerMixin(TestBaseElement) {}

    expect(MixedElement.prototype).toBeInstanceOf(TestBaseElement);
  });
});
