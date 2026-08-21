import { cleanup, fireEvent, render } from '@testing-library/react';
import type { CreateThumbnailOptions, ThumbnailApi } from '@videojs/core/dom';
import type { MediaTextTrackState } from '@videojs/media';
import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import type { HTMLProps } from '../../../utils/types';
import { Thumbnail, type ThumbnailProps } from '../thumbnail';

interface ThumbnailRecord {
  handle: ThumbnailApi;
  updateSrc: ReturnType<typeof vi.fn>;
  onStateChange: ReturnType<typeof vi.fn>;
}

const thumbnailMocks = vi.hoisted(() => ({ records: [] as ThumbnailRecord[] }));

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];

  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.mock('@videojs/core/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@videojs/core/dom')>();

  return {
    ...actual,
    createThumbnail(options: CreateThumbnailOptions) {
      const onStateChange = vi.fn(options.onStateChange);
      const handle = actual.createThumbnail({ ...options, onStateChange });
      const updateSrc = vi.fn(handle.updateSrc);
      handle.updateSrc = updateSrc;
      thumbnailMocks.records.push({ handle, updateSrc, onStateChange });
      return handle;
    },
  };
});

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {}

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  thumbnailMocks.records.length = 0;
  ResizeObserverStub.instances.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function createThumbnailWrapper() {
  return createPlayerWrapper({
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    thumbnailTrackCrossOrigin: null,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(),
    selectSubtitlesTrack: vi.fn(),
  }).Wrapper;
}

/**
 * Render a thumbnail inside a player reporting the given media CORS mode and
 * return the `crossorigin` attribute its inner `<img>` ends up with.
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
  it('publishes src and bindings only from committed renders', () => {
    const Wrapper = createThumbnailWrapper();
    const first = [{ url: 'first.jpg', startTime: 0 }];
    const second = [{ url: 'second.jpg', startTime: 0 }];

    function Thrower({ abandon }: { abandon: boolean }) {
      if (abandon) throw new Error('abandon render');
      return null;
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <Wrapper>
        <Boundary>
          <Thumbnail thumbnails={first} />
          <Thrower abandon={false} />
        </Boundary>
      </Wrapper>
    );
    const record = thumbnailMocks.records.at(-1)!;

    expect(record.updateSrc).toHaveBeenCalledWith('first.jpg');

    rerender(
      <Wrapper>
        <Boundary>
          <Thumbnail thumbnails={second} />
          <Thrower abandon />
        </Boundary>
      </Wrapper>
    );

    expect(record.updateSrc).not.toHaveBeenCalledWith('second.jpg');
    consoleError.mockRestore();
  });

  it('projects loading during SSR without updating the retained handle', () => {
    const Wrapper = createThumbnailWrapper();
    const html = renderToString(
      <Wrapper>
        <Thumbnail thumbnails={[{ url: 'server.jpg', startTime: 0 }]} />
      </Wrapper>
    );
    const record = thumbnailMocks.records.at(-1)!;

    expect(html).toContain('data-loading=""');
    expect(record.updateSrc).not.toHaveBeenCalled();
  });

  it('binds only the committed handle under StrictMode replay', () => {
    const Wrapper = createThumbnailWrapper();

    render(
      <StrictMode>
        <Wrapper>
          <Thumbnail thumbnails={[{ url: 'strict.jpg', startTime: 0 }]} />
        </Wrapper>
      </StrictMode>
    );

    const bound = thumbnailMocks.records.filter(({ updateSrc }) => updateSrc.mock.calls.length > 0);
    expect(bound).toHaveLength(1);
    expect(bound[0]!.updateSrc).toHaveBeenCalledWith('strict.jpg');
  });

  it('settles an already-cached image during layout commit', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(640);
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(360);
    const Wrapper = createThumbnailWrapper();

    const { getByTestId } = render(
      <Wrapper>
        <Thumbnail data-testid="thumbnail" thumbnails={[{ url: 'cached.jpg', startTime: 0 }]} />
      </Wrapper>
    );

    expect(getByTestId('thumbnail').hasAttribute('data-loading')).toBe(false);
    expect(getByTestId('thumbnail').hasAttribute('data-error')).toBe(false);
  });

  it('retargets same-src render override replacements for image events and resize', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
    const Wrapper = createThumbnailWrapper();
    const thumbnails = [{ url: 'same.jpg', startTime: 0 }];
    const override = (version: string) =>
      function renderThumbnail(props: HTMLProps) {
        return (
          <section {...props} key={version} data-testid={`container-${version}`}>
            {props.children}
          </section>
        );
      };
    const firstOverride = override('first');
    const secondOverride = override('second');
    const { getByTestId, rerender } = render(
      <Wrapper>
        <Thumbnail render={firstOverride} thumbnails={thumbnails} />
      </Wrapper>
    );
    const firstContainer = getByTestId('container-first');
    const firstImg = firstContainer.querySelector('img')!;
    const firstObserver = ResizeObserverStub.instances.at(-1)!;

    rerender(
      <Wrapper>
        <Thumbnail render={secondOverride} thumbnails={thumbnails} />
      </Wrapper>
    );

    const secondContainer = getByTestId('container-second');
    const secondImg = secondContainer.querySelector('img')!;
    const secondObserver = ResizeObserverStub.instances.at(-1)!;
    const record = thumbnailMocks.records.at(-1)!;

    expect(secondContainer).not.toBe(firstContainer);
    expect(secondImg).not.toBe(firstImg);
    expect(firstObserver.disconnect).toHaveBeenCalledOnce();
    expect(secondObserver).not.toBe(firstObserver);
    expect(secondObserver.observe).toHaveBeenCalledWith(secondContainer);

    fireEvent.error(firstImg);
    expect(secondContainer.hasAttribute('data-error')).toBe(false);

    fireEvent.error(secondImg);
    expect(secondContainer.hasAttribute('data-error')).toBe(true);

    record.onStateChange.mockClear();
    secondObserver.callback([], secondObserver as unknown as ResizeObserver);
    expect(record.onStateChange).toHaveBeenCalledOnce();
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
