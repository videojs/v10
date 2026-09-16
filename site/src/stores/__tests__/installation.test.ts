import { describe, expect, it } from 'vitest';

import { renderer, skin, useCase } from '../installation';

describe('useCase', () => {
  it('fits the skin and media to the new preset from the store values', () => {
    useCase.set('default-video');
    skin.set('minimal-video');
    renderer.set('youtube');

    useCase.set('default-audio');

    expect(skin.get()).toBe('minimal-audio');
    expect(renderer.get()).toBe('html5-audio');

    useCase.set('live-video');

    expect(skin.get()).toBe('minimal-video');
    expect(renderer.get()).toBe('hls');
  });
});
