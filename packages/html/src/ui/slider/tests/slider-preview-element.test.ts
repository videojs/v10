import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SliderElement } from '../slider-element';
import { SliderPreviewElement } from '../slider-preview-element';

// jsdom doesn't provide ResizeObserver.
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-slp');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SliderPreviewElement', () => {
  it('has the correct tag name', () => {
    expect(SliderPreviewElement.tagName).toBe('media-slider-preview');
  });

  it('defaults overflow to clamp', () => {
    const el = createElement(SliderPreviewElement);
    expect(el.overflow).toBe('clamp');
  });

  it('sets structural positioning styles after connect', async () => {
    const slider = createElement(SliderElement);
    const preview = createElement(SliderPreviewElement);

    slider.appendChild(preview);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await preview.updateComplete;

    expect(preview.style.position).toBe('absolute');
    expect(preview.style.pointerEvents).toBe('none');
    expect(preview.style.width).toBe('max-content');
  });

  it('applies clamped left style by default', async () => {
    const slider = createElement(SliderElement);
    const preview = createElement(SliderPreviewElement);

    // jsdom rejects CSS min()/calc() — spy on setProperty to capture values.
    const spy = vi.spyOn(preview.style, 'setProperty');

    slider.appendChild(preview);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await preview.updateComplete;

    const leftCall = spy.mock.calls.find(([key]) => key === 'left');
    expect(leftCall).toBeTruthy();
    expect(leftCall![1]).toContain('min(');
    expect(leftCall![1]).toContain('max(');
  });

  it('applies unclamped left style when overflow is visible', async () => {
    const slider = createElement(SliderElement);
    const preview = createElement(SliderPreviewElement);
    preview.overflow = 'visible';

    const spy = vi.spyOn(preview.style, 'setProperty');

    slider.appendChild(preview);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await preview.updateComplete;

    const leftCall = spy.mock.calls.find(([key]) => key === 'left');
    expect(leftCall).toBeTruthy();
    expect(leftCall![1]).toContain('calc(var(--media-slider-pointer)');
    expect(leftCall![1]).not.toContain('min(');
  });

  it('propagates data attributes from slider state', async () => {
    const slider = createElement(SliderElement);
    const preview = createElement(SliderPreviewElement);

    slider.appendChild(preview);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await preview.updateComplete;

    expect(preview.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('cleans up ResizeObserver on disconnect', async () => {
    const slider = createElement(SliderElement);
    const preview = createElement(SliderPreviewElement);

    slider.appendChild(preview);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await preview.updateComplete;

    // Should not throw when removed.
    slider.removeChild(preview);
  });
});
