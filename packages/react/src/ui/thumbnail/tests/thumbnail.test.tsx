import { cleanup, render } from '@testing-library/react';
import type { MediaTextTrackState } from '@videojs/media';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Thumbnail, type ThumbnailProps } from '../thumbnail';

afterEach(cleanup);

/**
 * Render a thumbnail inside a player reporting the given media CORS mode and return the `crossorigin` attribute its
 * inner `<img>` ends up with.
 */
function renderCrossOrigin(
  thumbnailTrackCrossOrigin: MediaTextTrackState['thumbnailTrackCrossOrigin'],
  props: ThumbnailProps = {}
): string | null {
  const { Wrapper } = createPlayerWrapper({
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    thumbnailTrackCrossOrigin,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(),
    selectSubtitlesTrack: vi.fn(),
  });

  const { container } = render(<Thumbnail data-testid="thumbnail" {...props} />, { wrapper: Wrapper });

  return container.querySelector('[data-testid="thumbnail"] img')!.getAttribute('crossorigin');
}

describe('Thumbnail', () => {
  describe('crossOrigin', () => {
    it('inherits the media element CORS mode when unset', () => {
      expect(renderCrossOrigin('anonymous')).toBe('anonymous');
      expect(renderCrossOrigin('use-credentials')).toBe('use-credentials');
    });

    it('sets nothing when the media element is not in CORS mode', () => {
      expect(renderCrossOrigin(null)).toBeNull();
    });

    it('prefers an explicit value over the inherited one', () => {
      expect(renderCrossOrigin('use-credentials', { crossOrigin: 'anonymous' })).toBe('anonymous');
    });

    it('opts out of inheritance for an explicit null', () => {
      expect(renderCrossOrigin('anonymous', { crossOrigin: null })).toBeNull();
    });

    it('passes an empty crossOrigin through rather than opting out', () => {
      // The CORS-settings attribute reads an empty value as Anonymous, so it is
      // a value like any other and must not be mistaken for "no CORS".
      expect(renderCrossOrigin('use-credentials', { crossOrigin: '' })).toBe('');
    });

    it('does not inherit for thumbnails supplied directly', () => {
      // Images passed as a prop may live anywhere, so they carry no
      // relationship to the media element's CORS mode.
      const attribute = renderCrossOrigin('anonymous', {
        thumbnails: [{ url: 'https://images.example.com/sprite.jpg', startTime: 0 }],
      });

      expect(attribute).toBeNull();
    });
  });
});
