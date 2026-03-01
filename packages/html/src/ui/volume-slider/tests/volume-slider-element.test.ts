import { afterEach, describe, expect, it } from 'vitest';

import { SliderThumbElement } from '../../slider/slider-thumb-element';
import { VolumeSliderElement } from '../volume-slider-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VolumeSliderElement', () => {
  it('has the correct tag name', () => {
    expect(VolumeSliderElement.tagName).toBe('media-volume-slider');
  });

  it('initializes with default property values', () => {
    const slider = createElement(VolumeSliderElement);
    expect(slider.label).toBe('Volume');
    expect(slider.step).toBe(1);
    expect(slider.largeStep).toBe(10);
    expect(slider.orientation).toBe('horizontal');
    expect(slider.disabled).toBe(false);
    expect(slider.thumbAlignment).toBe('center');
  });

  it('sets touch-action and user-select styles on connect', async () => {
    const slider = createElement(VolumeSliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.style.touchAction).toBe('none');
    expect(slider.style.userSelect).toBe('none');
  });

  it('supports vertical orientation', () => {
    const slider = createElement(VolumeSliderElement);
    slider.orientation = 'vertical';
    expect(slider.orientation).toBe('vertical');
  });

  it('does not set CSS vars without player context', async () => {
    const slider = createElement(VolumeSliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    // Without player store providing volume state, the element guards early.
    expect(slider.style.getPropertyValue('--media-slider-fill')).toBe('');
  });

  it('connects without errors when no store is available', async () => {
    const slider = createElement(VolumeSliderElement);
    const thumb = createElement(SliderThumbElement);

    slider.appendChild(thumb);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await thumb.updateComplete;

    expect(slider.isConnected).toBe(true);
    expect(thumb.isConnected).toBe(true);
  });

  it('cleans up on disconnect', async () => {
    const slider = createElement(VolumeSliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    document.body.removeChild(slider);

    // Verifies no errors during disconnect/cleanup.
    expect(slider.isConnected).toBe(false);
  });
});
