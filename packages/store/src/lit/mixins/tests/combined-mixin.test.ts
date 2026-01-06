import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, TestBaseElement, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

// Helper to create shadow root with named media slot
function createShadowWithSlot(el: HTMLElement): void {
  const shadow = el.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<slot name="media"></slot>';
}

describe('createStoreMixin', () => {
  it('provides store and attaches media', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-combined');

    class TestElement extends StoreMixin(TestBaseElement) {
      override createRenderRoot() {
        createShadowWithSlot(this);
        return this.shadowRoot!;
      }
    }
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.store).toBeDefined();
    expect(el.store.state).toEqual({ volume: 1, muted: false });
  });

  it('auto-attaches slotted video element', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-auto-attach');

    class TestElement extends StoreMixin(TestBaseElement) {
      override createRenderRoot() {
        createShadowWithSlot(this);
        return this.shadowRoot!;
      }
    }
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    const video = document.createElement('video');
    video.slot = 'media';
    el.appendChild(video);
    document.body.appendChild(el);
    await el.updateComplete;

    // Wait for slotchange
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(el.store.target).toBe(video);
  });

  it('auto-attaches light DOM video when no shadow root', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-light-dom');

    class TestElement extends StoreMixin(TestBaseElement) {
      override createRenderRoot() {
        return this; // Use light DOM
      }
    }
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    const video = document.createElement('video');
    el.appendChild(video);
    document.body.appendChild(el);
    await el.updateComplete;

    // Wait for attachment
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(el.store.target).toBe(video);
  });

  it('finds nested video element', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-nested');

    class TestElement extends StoreMixin(TestBaseElement) {
      override createRenderRoot() {
        createShadowWithSlot(this);
        return this.shadowRoot!;
      }
    }
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    const wrapper = document.createElement('div');
    wrapper.slot = 'media';
    const video = document.createElement('video');
    wrapper.appendChild(video);
    el.appendChild(wrapper);
    document.body.appendChild(el);
    await el.updateComplete;

    // Wait for slotchange
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(el.store.target).toBe(video);
  });

  it('auto-attaches audio element', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-audio');

    class TestElement extends StoreMixin(TestBaseElement) {
      override createRenderRoot() {
        createShadowWithSlot(this);
        return this.shadowRoot!;
      }
    }
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    const audio = document.createElement('audio');
    audio.slot = 'media';
    el.appendChild(audio);
    document.body.appendChild(el);
    await el.updateComplete;

    // Wait for slotchange
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(el.store.target).toBe(audio);
  });

  it('attaches only the first media element when multiple exist', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-multiple-media');

    class TestElement extends StoreMixin(TestBaseElement) {
      override createRenderRoot() {
        createShadowWithSlot(this);
        return this.shadowRoot!;
      }
    }
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as TestElement;
    const video1 = document.createElement('video');
    video1.slot = 'media';
    const video2 = document.createElement('video');
    video2.slot = 'media';
    el.appendChild(video1);
    el.appendChild(video2);
    document.body.appendChild(el);
    await el.updateComplete;

    // Wait for slotchange
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Should attach only the first one
    expect(el.store.target).toBe(video1);
  });
});
