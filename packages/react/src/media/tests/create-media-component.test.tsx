import { render } from '@testing-library/react';
import { HTMLAudioAdapter, HTMLMediaAdapter, HTMLVideoAdapter } from '@videojs/media/dom';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { createMediaComponent } from '../create-media-component';

class FakeAdapter extends HTMLVideoAdapter {
  static readonly defaultProps = { src: '', debug: false };

  readonly engine = null;

  #src = '';
  debug = false;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }
}

class FakeAudioAdapter extends HTMLAudioAdapter {
  static readonly defaultProps = { src: '' };

  readonly engine = null;
}

const Video = createMediaComponent(
  FakeAdapter,
  ({ props, children, ref }) => (
    <video {...props} ref={ref}>
      {children}
    </video>
  ),
  { displayName: 'FakeVideo' }
);

describe('createMediaComponent', () => {
  it('renders what the callback returns and attaches the adapter to it', () => {
    const attach = vi.spyOn(HTMLMediaAdapter.prototype, 'attach');
    const Audio = createMediaComponent(FakeAudioAdapter, ({ props, ref }) => <audio {...props} ref={ref} />);

    const { container } = render(
      <>
        <Video data-testid="video">
          <track kind="captions" />
        </Video>
        <Audio data-testid="audio" />
      </>
    );

    expect(container.querySelector('video')?.getAttribute('data-testid')).toBe('video');
    expect(container.querySelector('video track')).not.toBeNull();
    expect(container.querySelector('audio')?.getAttribute('data-testid')).toBe('audio');
    expect(attach).toHaveBeenCalledWith(container.querySelector('video'));
    expect(attach).toHaveBeenCalledWith(container.querySelector('audio'));

    attach.mockRestore();
  });

  it('syncs adapter props onto the adapter and forwards the rest to the element', () => {
    const src = vi.spyOn(FakeAdapter.prototype, 'src', 'set');

    const { container } = render(<Video src="https://example.com/video.m3u8" debug controls />);

    expect(src).toHaveBeenCalledWith('https://example.com/video.m3u8');
    expect((src.mock.contexts[0] as FakeAdapter).debug).toBe(true);
    expect(container.querySelector('video')?.hasAttribute('src')).toBe(false);
    expect(container.querySelector('video')?.hasAttribute('controls')).toBe(true);

    src.mockRestore();
  });

  it('hands the callback the adapter and the frozen first-render props', () => {
    const seen: Array<{ initialSrc: string | undefined; adapterSrc: string }> = [];
    const Component = createMediaComponent(FakeAdapter, ({ adapter, initialProps, props, ref }) => {
      seen.push({ initialSrc: initialProps.src, adapterSrc: adapter.src });

      return <video {...props} ref={ref} />;
    });

    const { rerender } = render(<Component src="first.m3u8" />);

    rerender(<Component src="second.m3u8" />);

    expect(seen.map((entry) => entry.initialSrc)).toEqual(['first.m3u8', 'first.m3u8']);
    expect(seen.map((entry) => entry.adapterSrc)).toEqual(['first.m3u8', 'second.m3u8']);
  });

  it('forwards the ref to the rendered element and names the component', () => {
    const ref = createRef<HTMLVideoElement>();

    render(<Video ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLVideoElement);
    expect(Video.displayName).toBe('FakeVideo');
    expect(createMediaComponent(FakeAdapter, ({ props, ref }) => <video {...props} ref={ref} />).displayName).toBe(
      'FakeAdapter'
    );
  });
});
