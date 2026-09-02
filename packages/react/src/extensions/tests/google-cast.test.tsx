import { render } from '@testing-library/react';
import { GoogleCastExtension } from '@videojs/google-cast';
import { HlsJsAdapter } from '@videojs/hlsjs-video';
import type { Media } from '@videojs/media';
import { getMediaExtensions } from '@videojs/media/dom';
import { describe, expect, it } from 'vite-plus/test';

import { createPlayerWrapper } from '../../testing/mocks';
import { GoogleCast } from '../google-cast';

function setup(media: Media | null = new HlsJsAdapter()) {
  const { value, Wrapper } = createPlayerWrapper();

  value.media = media;
  return { media, Wrapper };
}

describe('GoogleCast', () => {
  it('registers a GoogleCast component with the media from context', () => {
    const { media, Wrapper } = setup();

    render(<GoogleCast />, { wrapper: Wrapper });

    expect(getMediaExtensions(media as HlsJsAdapter).get(GoogleCastExtension)).toBeInstanceOf(GoogleCastExtension);
  });

  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    render(<GoogleCast receiver="APP_ID" contentType="application/x-mpegURL" streamType="live" />, {
      wrapper: Wrapper,
    });

    const component = getMediaExtensions(media as HlsJsAdapter).get(GoogleCastExtension)!;

    expect(component.receiver).toBe('APP_ID');
    expect(component.contentType).toBe('application/x-mpegURL');
    expect(component.streamType).toBe('live');
  });

  it('resets a removed prop to its default', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(<GoogleCast receiver="APP_ID" />, { wrapper: Wrapper });

    rerender(<GoogleCast />);

    expect(getMediaExtensions(media as HlsJsAdapter).get(GoogleCastExtension)!.receiver).toBeUndefined();
  });

  it('removes the component on unmount', () => {
    const { media, Wrapper } = setup();

    const { unmount } = render(<GoogleCast />, { wrapper: Wrapper });

    unmount();

    expect(getMediaExtensions(media as HlsJsAdapter).get(GoogleCastExtension)).toBeUndefined();
  });

  it('ignores media that is not a media adapter', () => {
    const video = document.createElement('video') as unknown as Media;
    const { Wrapper } = setup(video);

    render(<GoogleCast />, { wrapper: Wrapper });

    expect(getMediaExtensions(video as any).get(GoogleCastExtension)).toBeUndefined();
  });
});
