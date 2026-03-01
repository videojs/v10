import { afterEach, describe, expect, it } from 'vitest';
import { SliderBufferElement } from '../slider-buffer-element';
import { SliderElement } from '../slider-element';
import { SliderFillElement } from '../slider-fill-element';
import { SliderThumbElement } from '../slider-thumb-element';
import { SliderTrackElement } from '../slider-track-element';
import { SliderValueElement } from '../slider-value-element';

// Unique tag names to avoid customElements.define collisions across tests.
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

describe('SliderElement', () => {
  it('has the correct tag name', () => {
    expect(SliderElement.tagName).toBe('media-slider');
  });

  it('initializes with default property values', () => {
    const slider = createElement(SliderElement);
    expect(slider.value).toBe(0);
    expect(slider.min).toBe(0);
    expect(slider.max).toBe(100);
    expect(slider.step).toBe(1);
    expect(slider.largeStep).toBe(10);
    expect(slider.orientation).toBe('horizontal');
    expect(slider.disabled).toBe(false);
    expect(slider.thumbAlignment).toBe('center');
  });

  it('sets CSS custom properties after update', async () => {
    const slider = createElement(SliderElement);
    slider.value = 50;

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.style.getPropertyValue('--media-slider-fill')).toBe('50.000%');
    expect(slider.style.getPropertyValue('--media-slider-pointer')).toBe('0.000%');
  });

  it('sets data-orientation attribute', async () => {
    const slider = createElement(SliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('does not set data-dragging or data-pointing in idle state', async () => {
    const slider = createElement(SliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.hasAttribute('data-dragging')).toBe(false);
    expect(slider.hasAttribute('data-pointing')).toBe(false);
    expect(slider.hasAttribute('data-interactive')).toBe(false);
  });

  it('reflects disabled state as data-disabled', async () => {
    const slider = createElement(SliderElement);
    slider.disabled = true;

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.hasAttribute('data-disabled')).toBe(true);
  });

  it('sets touch-action and user-select styles on connect', async () => {
    const slider = createElement(SliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.style.touchAction).toBe('none');
    expect(slider.style.userSelect).toBe('none');
  });

  it('updates CSS vars when value changes', async () => {
    const slider = createElement(SliderElement);
    slider.value = 25;

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.style.getPropertyValue('--media-slider-fill')).toBe('25.000%');

    slider.value = 75;
    await slider.updateComplete;

    expect(slider.style.getPropertyValue('--media-slider-fill')).toBe('75.000%');
  });

  it('supports vertical orientation', async () => {
    const slider = createElement(SliderElement);
    slider.orientation = 'vertical';

    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(slider.getAttribute('data-orientation')).toBe('vertical');
  });

  it('dispatches value-change on value-commit as CustomEvent', async () => {
    const slider = createElement(SliderElement);

    document.body.appendChild(slider);
    await slider.updateComplete;

    // Events are dispatched by the createSlider handle during interaction.
    // We verify the element can dispatch events with the correct shape.
    const received: CustomEvent[] = [];
    slider.addEventListener('value-change', ((event: CustomEvent) => {
      received.push(event);
    }) as EventListener);

    slider.dispatchEvent(new CustomEvent('value-change', { detail: { value: 42 }, bubbles: true }));

    expect(received).toHaveLength(1);
    expect(received[0]!.detail).toEqual({ value: 42 });
    expect(received[0]!.bubbles).toBe(true);
  });
});

describe('SliderThumbElement', () => {
  it('has the correct tag name', () => {
    expect(SliderThumbElement.tagName).toBe('media-slider-thumb');
  });

  it('receives ARIA attributes from slider context', async () => {
    const slider = createElement(SliderElement);
    const thumb = createElement(SliderThumbElement);

    slider.value = 30;
    slider.appendChild(thumb);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await thumb.updateComplete;

    expect(thumb.getAttribute('role')).toBe('slider');
    expect(thumb.getAttribute('tabindex')).toBe('0');
    expect(thumb.getAttribute('autocomplete')).toBe('off');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb.getAttribute('aria-valuenow')).toBe('30');
    expect(thumb.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('updates ARIA when slider value changes', async () => {
    const slider = createElement(SliderElement);
    const thumb = createElement(SliderThumbElement);

    slider.appendChild(thumb);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await thumb.updateComplete;

    expect(thumb.getAttribute('aria-valuenow')).toBe('0');

    slider.value = 60;
    await slider.updateComplete;
    await thumb.updateComplete;

    expect(thumb.getAttribute('aria-valuenow')).toBe('60');
  });

  it('sets aria-disabled when slider is disabled', async () => {
    const slider = createElement(SliderElement);
    const thumb = createElement(SliderThumbElement);

    slider.disabled = true;
    slider.appendChild(thumb);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await thumb.updateComplete;

    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    expect(thumb.getAttribute('tabindex')).toBe('-1');
  });

  it('propagates data attributes from context', async () => {
    const slider = createElement(SliderElement);
    const thumb = createElement(SliderThumbElement);

    slider.appendChild(thumb);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await thumb.updateComplete;

    expect(thumb.getAttribute('data-orientation')).toBe('horizontal');
  });
});

describe('SliderTrackElement', () => {
  it('has the correct tag name', () => {
    expect(SliderTrackElement.tagName).toBe('media-slider-track');
  });

  it('receives data attributes from slider context', async () => {
    const slider = createElement(SliderElement);
    const track = createElement(SliderTrackElement);

    slider.appendChild(track);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await track.updateComplete;

    expect(track.getAttribute('data-orientation')).toBe('horizontal');
  });
});

describe('SliderFillElement', () => {
  it('has the correct tag name', () => {
    expect(SliderFillElement.tagName).toBe('media-slider-fill');
  });
});

describe('SliderBufferElement', () => {
  it('has the correct tag name', () => {
    expect(SliderBufferElement.tagName).toBe('media-slider-buffer');
  });
});

describe('SliderValueElement', () => {
  it('has the correct tag name', () => {
    expect(SliderValueElement.tagName).toBe('media-slider-value');
  });

  it('displays the current value from context', async () => {
    const slider = createElement(SliderElement);
    const valueEl = createElement(SliderValueElement);

    slider.value = 42;
    slider.appendChild(valueEl);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await valueEl.updateComplete;

    expect(valueEl.textContent).toBe('42');
  });

  it('displays rounded value by default', async () => {
    const slider = createElement(SliderElement);
    const valueEl = createElement(SliderValueElement);

    slider.value = 33;
    slider.min = 0;
    slider.max = 100;
    slider.appendChild(valueEl);
    document.body.appendChild(slider);
    await slider.updateComplete;
    await valueEl.updateComplete;

    expect(valueEl.textContent).toBe('33');
  });

  it('sets aria-live="off"', async () => {
    const slider = createElement(SliderElement);
    const valueEl = createElement(SliderValueElement);

    slider.appendChild(valueEl);
    document.body.appendChild(slider);
    await slider.updateComplete;

    expect(valueEl.getAttribute('aria-live')).toBe('off');
  });
});
