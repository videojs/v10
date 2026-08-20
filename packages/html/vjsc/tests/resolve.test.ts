import { describe, expect, it } from 'vitest';

import { resolveHtmlEntry } from '../resolve';

describe('resolveHtmlEntry', () => {
  it('maps leaf components to their public custom elements', () => {
    expect(resolveHtmlEntry({ component: 'PlayButton', part: null })).toEqual({
      tagName: 'media-play-button',
      import: { from: '@videojs/html/ui/play-button', sideEffect: true },
    });
    expect(resolveHtmlEntry({ component: 'Container', part: null })).toEqual({
      tagName: 'media-container',
      import: { from: '@videojs/html/media/container', sideEffect: true },
    });
    expect(resolveHtmlEntry({ component: 'AirPlayButton', part: null })).toEqual({
      tagName: 'media-airplay-button',
      import: { from: '@videojs/html/ui/airplay-button', sideEffect: true },
    });
    expect(resolveHtmlEntry({ component: 'PiPButton', part: null })).toEqual({
      tagName: 'media-pip-button',
      import: { from: '@videojs/html/ui/pip-button', sideEffect: true },
    });
  });

  it('maps compound parts to grouped and individual definition modules', () => {
    expect(resolveHtmlEntry({ component: 'Menu', part: 'Item' })).toEqual({
      tagName: 'media-menu-item',
      import: { from: '@videojs/html/ui/menu', sideEffect: true },
    });
    expect(resolveHtmlEntry({ component: 'Slider', part: 'Thumb' })).toEqual({
      tagName: 'media-slider-thumb',
      import: { from: '@videojs/html/ui/slider-thumb', sideEffect: true },
    });
  });
});
