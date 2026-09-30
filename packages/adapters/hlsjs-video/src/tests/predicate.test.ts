import { CustomMediaElement } from '@videojs/media/dom';
import { NativeHlsAdapter } from '@videojs/native-hls-video';
import { describe, expect, it } from 'vite-plus/test';

import { HlsJsAdapter, isHlsJsAdapter } from '../index';

customElements.define('test-predicate-hlsjs-video', CustomMediaElement('video', HlsJsAdapter as never));

describe('isHlsJsAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new HlsJsAdapter();

    expect(isHlsJsAdapter(media)).toBe(true);

    media.destroy();
  });

  it('recognizes a media element built on the adapter', () => {
    const element = document.createElement('test-predicate-hlsjs-video');

    expect(isHlsJsAdapter(element)).toBe(true);
    expect(isHlsJsAdapter(document.createElement('video'))).toBe(false);
  });

  it('rejects other media', () => {
    const media = new NativeHlsAdapter();

    expect(isHlsJsAdapter(media)).toBe(false);
    expect(isHlsJsAdapter(null)).toBe(false);

    media.destroy();
  });
});
