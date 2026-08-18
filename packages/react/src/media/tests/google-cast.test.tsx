import { render } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { GoogleCast as GoogleCastComponent } from '@videojs/media/dom/google-cast';
import { HlsJsMedia } from '@videojs/media/dom/hls-js';
import { getMediaComponents } from '@videojs/media/dom/media-host';
import { describe, expect, it } from 'vitest';
import { createPlayerWrapper } from '../../testing/mocks';
import { GoogleCast } from '../google-cast';

function setup(media: Media | null = new HlsJsMedia()) {
  const { value, Wrapper } = createPlayerWrapper();
  value.media = media;
  return { media, Wrapper };
}

describe('GoogleCast', () => {
  it('registers a GoogleCast component with the media from context', () => {
    const { media, Wrapper } = setup();

    render(<GoogleCast />, { wrapper: Wrapper });

    expect(getMediaComponents(media as HlsJsMedia).get(GoogleCastComponent)).toBeInstanceOf(GoogleCastComponent);
  });

  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    render(<GoogleCast receiver="APP_ID" contentType="application/x-mpegURL" streamType="live" />, {
      wrapper: Wrapper,
    });

    const component = getMediaComponents(media as HlsJsMedia).get(GoogleCastComponent)!;
    expect(component.receiver).toBe('APP_ID');
    expect(component.contentType).toBe('application/x-mpegURL');
    expect(component.streamType).toBe('live');
  });

  it('resets a removed prop to its default', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(<GoogleCast receiver="APP_ID" />, { wrapper: Wrapper });
    rerender(<GoogleCast />);

    expect(getMediaComponents(media as HlsJsMedia).get(GoogleCastComponent)!.receiver).toBeUndefined();
  });

  it('removes the component on unmount', () => {
    const { media, Wrapper } = setup();

    const { unmount } = render(<GoogleCast />, { wrapper: Wrapper });
    unmount();

    expect(getMediaComponents(media as HlsJsMedia).get(GoogleCastComponent)).toBeUndefined();
  });

  it('ignores media that is not a media host', () => {
    const video = document.createElement('video') as unknown as Media;
    const { Wrapper } = setup(video);

    render(<GoogleCast />, { wrapper: Wrapper });

    expect(getMediaComponents(video as any).get(GoogleCastComponent)).toBeUndefined();
  });
});
