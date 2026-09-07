import { MuxVideoAdapter } from '@videojs/mux-video';
import { describe, expect, it } from 'vite-plus/test';

import { MuxAudioAdapter } from '..';

describe('MuxAudioAdapter', () => {
  it('is the hls.js-backed Mux adapter, playable through an <audio> element', () => {
    const adapter = new MuxAudioAdapter();

    expect(adapter).toBeInstanceOf(MuxVideoAdapter);
    expect(MuxAudioAdapter.defaultProps).toBe(MuxVideoAdapter.defaultProps);
    expect(adapter.src).toBe('');
    expect(adapter.source).toBeNull();
  });
});
