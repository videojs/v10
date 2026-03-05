import { afterEach, describe, expect, it } from 'vitest';

import { ThumbnailElement } from '../../thumbnail/thumbnail-element';
import { SliderElement } from '../slider-element';
import { SliderThumbnailElement } from '../slider-thumbnail-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-slt');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SliderThumbnailElement', () => {
  it('has the correct tag name', () => {
    expect(SliderThumbnailElement.tagName).toBe('media-slider-thumbnail');
  });

  it('extends ThumbnailElement', () => {
    const el = createElement(SliderThumbnailElement);
    expect(el).toBeInstanceOf(ThumbnailElement);
  });

  it('has a shadow root with an img element', () => {
    const el = createElement(SliderThumbnailElement);
    expect(el.shadowRoot).toBeTruthy();

    const img = el.shadowRoot!.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('aria-hidden')).toBe('true');
  });

  it('inherits time property from ThumbnailElement', () => {
    const el = createElement(SliderThumbnailElement);
    expect(el.time).toBe(0);

    el.time = 10;
    expect(el.time).toBe(10);
  });

  it('sets data-hidden when no thumbnails are available', async () => {
    const el = createElement(SliderThumbnailElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.hasAttribute('data-hidden')).toBe(true);
  });

  it('reads pointerValue from slider context as time', async () => {
    const slider = createElement(SliderElement);
    const thumbnail = createElement(SliderThumbnailElement);

    thumbnail.thumbnails = [
      { url: 'thumb-0.jpg', startTime: 0 },
      { url: 'thumb-30.jpg', startTime: 30 },
      { url: 'thumb-60.jpg', startTime: 60 },
    ];

    slider.appendChild(thumbnail);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await thumbnail.updateComplete;

    // In idle state, pointerPercent=0 → pointerValue=0 → selects 'thumb-0.jpg'.
    const img = thumbnail.shadowRoot!.querySelector('img');
    expect(img!.getAttribute('src')).toBe('thumb-0.jpg');
  });

  it('does not have data-hidden when thumbnails match', async () => {
    const slider = createElement(SliderElement);
    const thumbnail = createElement(SliderThumbnailElement);

    thumbnail.thumbnails = [{ url: 'thumb.jpg', startTime: 0 }];

    slider.appendChild(thumbnail);
    document.body.appendChild(slider);

    await slider.updateComplete;
    await thumbnail.updateComplete;

    expect(thumbnail.hasAttribute('data-hidden')).toBe(false);
  });
});
