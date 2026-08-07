import { afterEach, describe, expect, it, vi } from 'vitest';

import { SliderElement } from '../slider-element';
import { SliderSegmentsElement } from '../slider-segments-element';

let tagCounter = 0;

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = `test-slider-segments-${tagCounter++}`;
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

async function waitForUpdates(...elements: Array<{ updateComplete: Promise<boolean> }>): Promise<void> {
  for (const element of elements) await element.updateComplete;
  await Promise.resolve();
  for (const element of elements) await element.updateComplete;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SliderSegmentsElement', () => {
  it('is hidden when there are no ranges', async () => {
    const slider = createElement(SliderElement);
    const segments = createElement(SliderSegmentsElement);

    slider.append(segments);
    document.body.append(slider);
    await waitForUpdates(slider, segments);

    expect(segments.hidden).toBe(true);
    expect(segments.hasAttribute('data-segments')).toBe(false);
    expect(segments.querySelector('clipPath')?.id).toBe('');
    expect(slider.style.getPropertyValue('--media-slider-clip-path')).toBe('');
  });

  it('renders ranges from the slider value domain', async () => {
    const slider = createElement(SliderElement);
    const segments = createElement(SliderSegmentsElement);
    slider.min = 20;
    slider.max = 100;
    segments.segments = [
      { start: 20, end: 40 },
      { start: 40, end: 100 },
    ];

    slider.append(segments);
    document.body.append(slider);
    await waitForUpdates(slider, segments);

    const clipPath = segments.querySelector('[data-slot="slider-segments-clip-path"]');
    const rects = segments.querySelectorAll<SVGRectElement>('[data-slot="slider-segment"]');
    expect(segments.hasAttribute('data-segments')).toBe(true);
    expect(clipPath).toBeTruthy();
    expect(rects).toHaveLength(2);
    expect(rects[0]?.style.getPropertyValue('--media-slider-segment-size')).toBe('25%');
    expect(rects[0]?.style.getPropertyValue('--media-slider-segment-offset')).toBe('0%');
    expect(rects[1]?.style.getPropertyValue('--media-slider-segment-size')).toBe('75%');
    expect(rects[1]?.style.getPropertyValue('--media-slider-segment-offset')).toBe('25%');
    expect(rects[0]?.hasAttribute('data-highlighted')).toBe(false);
    expect(rects[1]?.hasAttribute('data-highlighted')).toBe(false);

    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 20));
    slider.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 10 }));
    await waitForUpdates(slider, segments);

    const updatedRects = segments.querySelectorAll('rect');
    expect(updatedRects[0]).toBe(rects[0]);
    expect(updatedRects[0]?.hasAttribute('data-highlighted')).toBe(true);
  });

  it('uses the slider orientation and clip path ID', async () => {
    const slider = createElement(SliderElement);
    const segments = createElement(SliderSegmentsElement);
    slider.orientation = 'vertical';
    segments.segments = [{ start: 0, end: 25 }];

    slider.append(segments);
    document.body.append(slider);
    await waitForUpdates(slider, segments);

    const clipPath = segments.querySelector('clipPath');
    expect(segments.getAttribute('data-orientation')).toBe('vertical');
    expect(slider.style.getPropertyValue('--media-slider-clip-path')).toBe(`url("#${clipPath?.id}")`);
  });

  it('clears the track clip path when disconnected', async () => {
    const slider = createElement(SliderElement);
    const segments = createElement(SliderSegmentsElement);
    segments.segments = [{ start: 0, end: 25 }];

    slider.append(segments);
    document.body.append(slider);
    await waitForUpdates(slider, segments);

    expect(slider.style.getPropertyValue('--media-slider-clip-path')).not.toBe('');

    segments.remove();
    expect(slider.style.getPropertyValue('--media-slider-clip-path')).toBe('');
  });
});
