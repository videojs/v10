import { cleanup, render } from '@testing-library/react';
import type { MediaTextTrackState } from '@videojs/media';
import { createRef, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Thumbnail } from '..';
import { createPlayerWrapper } from '../../../testing/mocks';

afterEach(cleanup);

function wrapper(thumbnailTrackCrossOrigin: MediaTextTrackState['thumbnailTrackCrossOrigin'] = null) {
  return createPlayerWrapper({
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    thumbnailTrackCrossOrigin,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(),
    selectSubtitlesTrack: vi.fn(),
  }).Wrapper;
}

function DefaultThumbnail({
  rootProps = {},
  imageProps = {},
  children,
}: {
  rootProps?: Thumbnail.RootProps | undefined;
  imageProps?: Thumbnail.ImageProps | undefined;
  children?: ReactNode | undefined;
}) {
  return (
    <Thumbnail.Root data-testid="thumbnail" {...rootProps}>
      <Thumbnail.Image data-testid="image" {...imageProps} />
      {children}
    </Thumbnail.Root>
  );
}

/** Render a thumbnail and return the `crossorigin` attribute on its image. */
function renderCrossOrigin(
  thumbnailTrackCrossOrigin: MediaTextTrackState['thumbnailTrackCrossOrigin'],
  imageProps: Thumbnail.ImageProps = {},
  rootProps: Thumbnail.RootProps = {}
): string | null {
  const { container } = render(<DefaultThumbnail rootProps={rootProps} imageProps={imageProps} />, {
    wrapper: wrapper(thumbnailTrackCrossOrigin),
  });

  return container.querySelector('[data-testid="image"]')!.getAttribute('crossorigin');
}

describe('Thumbnail', () => {
  it('renders a root around the selected image', () => {
    const { getByTestId } = render(
      <DefaultThumbnail rootProps={{ thumbnails: [{ url: 'thumbnail.jpg', startTime: 0 }], time: 12 }} />,
      { wrapper: wrapper() }
    );

    expect(getByTestId('thumbnail').tagName).toBe('DIV');
    expect(getByTestId('thumbnail').getAttribute('role')).toBe('img');
    expect(getByTestId('thumbnail').getAttribute('aria-hidden')).toBe('true');
    expect(getByTestId('image').tagName).toBe('IMG');
    expect(getByTestId('image').getAttribute('src')).toBe('thumbnail.jpg');
    expect(getByTestId('image').getAttribute('decoding')).toBe('async');
  });

  it('reports state on the root', () => {
    const { getByTestId } = render(<DefaultThumbnail />, { wrapper: wrapper() });

    expect(getByTestId('thumbnail').hasAttribute('data-hidden')).toBe(true);
    expect(getByTestId('image').hasAttribute('data-hidden')).toBe(false);
  });

  it('accepts sibling presentation layers', () => {
    const { getByTestId } = render(
      <DefaultThumbnail>
        <div data-testid="overlay" />
      </DefaultThumbnail>,
      { wrapper: wrapper() }
    );

    expect(getByTestId('thumbnail').contains(getByTestId('overlay'))).toBe(true);
  });

  it('forwards root and image refs', () => {
    const rootRef = createRef<HTMLDivElement>();
    const imgRef = createRef<HTMLImageElement>();

    render(
      <Thumbnail.Root ref={rootRef}>
        <Thumbnail.Image ref={imgRef} />
      </Thumbnail.Root>,
      { wrapper: wrapper() }
    );

    expect(rootRef.current).toBeInstanceOf(HTMLDivElement);
    expect(imgRef.current).toBeInstanceOf(HTMLImageElement);
  });

  it('supports an image render override without replacing the root', () => {
    const { getByTestId } = render(
      <Thumbnail.Root data-testid="thumbnail" thumbnails={[{ url: 'thumbnail.jpg', startTime: 0 }]}>
        <Thumbnail.Image render={(props) => <img {...props} data-testid="custom-image" />} />
      </Thumbnail.Root>,
      { wrapper: wrapper() }
    );

    expect(getByTestId('thumbnail').tagName).toBe('DIV');
    expect(getByTestId('custom-image').getAttribute('src')).toBe('thumbnail.jpg');
  });

  it('requires the image to be inside a root', () => {
    expect(() => render(<Thumbnail.Image />)).toThrow(
      'Thumbnail compound components must be used within a Thumbnail.Root'
    );
  });

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
      expect(renderCrossOrigin('use-credentials', { crossOrigin: '' })).toBe('');
    });

    it('does not inherit for thumbnails supplied directly', () => {
      const attribute = renderCrossOrigin(
        'anonymous',
        {},
        { thumbnails: [{ url: 'https://images.example.com/sprite.jpg', startTime: 0 }] }
      );

      expect(attribute).toBeNull();
    });
  });
});
