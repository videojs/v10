import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { VideoSkin } from '../skin';

afterEach(cleanup);

/** Only the playback and metadata state the poster reads; the rest renders null. */
function wrapper() {
  return createPlayerWrapper({
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play: async () => {},
    pause: () => {},
    togglePaused: () => true,
    title: '',
    poster: 'poster.jpg',
  }).Wrapper;
}

describe('VideoSkin', () => {
  it('draws its own poster image', () => {
    const { container } = render(<VideoSkin />, { wrapper: wrapper() });

    // The skin reaches the poster as a direct child, so it carries no class of its own.
    const img = container.querySelector('.media-default-skin > img');
    expect(img?.getAttribute('src')).toBe('poster.jpg');
  });

  it('lets renderPoster draw the poster instead', () => {
    const { container } = render(<VideoSkin renderPoster={(props) => <div {...props} data-testid="custom" />} />, {
      wrapper: wrapper(),
    });

    expect(container.querySelector('.media-default-skin > img')).toBeNull();

    const custom = container.querySelector('[data-testid="custom"]');
    expect(custom?.getAttribute('src')).toBe('poster.jpg');
  });
});
