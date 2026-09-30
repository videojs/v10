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
  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(
      <GoogleCast receiver="APP_ID" contentType="application/x-mpegURL" streamType="live" />,
      {
        wrapper: Wrapper,
      }
    );

    const component = getMediaExtensions(media as HlsJsAdapter).get(GoogleCastExtension)!;

    expect(component.receiver).toBe('APP_ID');
    expect(component.contentType).toBe('application/x-mpegURL');
    expect(component.streamType).toBe('live');

    rerender(<GoogleCast />);
    expect(component.receiver).toBeUndefined();
  });
});
