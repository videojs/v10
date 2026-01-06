import { describe, expect, it } from 'vitest';

import { createLitTestStore, setupDomCleanup, uniqueTag } from '../../tests/test-utils';

setupDomCleanup();

describe('createStoreMixin', () => {
  it('provides store and attaches media', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-combined');

    const TestElement = StoreMixin(
      class extends HTMLElement {
        connectedCallback() {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      },
    );
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
    document.body.appendChild(el);

    expect(el.store).toBeDefined();
    expect(el.store.state).toEqual({ volume: 1, muted: false });
  });

  it('auto-attaches slotted video element', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-auto-attach');

    const TestElement = StoreMixin(
      class extends HTMLElement {
        connectedCallback() {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      },
    );
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
    const video = document.createElement('video');
    el.appendChild(video);
    document.body.appendChild(el);

    // Wait for slotchange
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(el.store.target).toBe(video);
  });

  it('auto-attaches light DOM video when no shadow root', async () => {
    const { StoreMixin } = createLitTestStore();
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
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-nested');

    const TestElement = StoreMixin(
      class extends HTMLElement {
        connectedCallback() {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      },
    );
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
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
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-audio');

    const TestElement = StoreMixin(
      class extends HTMLElement {
        connectedCallback() {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      },
    );
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
    const audio = document.createElement('audio');
    el.appendChild(audio);
    document.body.appendChild(el);

    // Wait for slotchange
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(el.store.target).toBe(audio);
  });

  it('attaches only the first media element when multiple exist', async () => {
    const { StoreMixin } = createLitTestStore();
    const tagName = uniqueTag('test-multiple-media');

    const TestElement = StoreMixin(
      class extends HTMLElement {
        connectedCallback() {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot!.innerHTML = '<slot></slot>';
        }
      },
    );
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName) as InstanceType<typeof TestElement>;
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
