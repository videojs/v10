import { CustomMediaElement } from '@videojs/media/dom';
import { NativeHlsAdapter } from '@videojs/native-hls-video';
import { describe, expect, it } from 'vite-plus/test';

import { HlsJsAdapter, isHlsJsMedia } from '../index';

customElements.define('test-predicate-hlsjs-video', CustomMediaElement('video', HlsJsAdapter as never));

describe('isHlsJsMedia', () => {
  it('recognizes the adapter', () => {
    const media = new HlsJsAdapter();

    expect(isHlsJsMedia(media)).toBe(true);

    media.destroy();
  });

  it('recognizes a media element built on the adapter', () => {
    const element = document.createElement('test-predicate-hlsjs-video');

    expect(isHlsJsMedia(element)).toBe(true);
    expect(isHlsJsMedia(document.createElement('video'))).toBe(false);
  });

  it('rejects other media', () => {
    const media = new NativeHlsAdapter();

    expect(isHlsJsMedia(media)).toBe(false);
    expect(isHlsJsMedia(null)).toBe(false);

    media.destroy();
  });
});
