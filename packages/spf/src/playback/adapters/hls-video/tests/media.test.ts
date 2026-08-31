import { getMediaCapabilityEvents, supportsMediaCapability } from '@videojs/media';
import { describe, expect, it } from 'vite-plus/test';

import { HlsVideoMedia } from '../media';

describe('HlsVideoMedia', () => {
  it('declares its full official surface in the manifest, host-composed and adapter-owned alike', () => {
    // Host-composed.
    expect(supportsMediaCapability(HlsVideoMedia, 'volume')).toBe(true);
    expect(supportsMediaCapability(HlsVideoMedia, 'source')).toBe(true);

    // Adapter-owned: implemented by the mixin, declared as metadata.
    expect(supportsMediaCapability(HlsVideoMedia, 'stream-type')).toBe(true);
    expect(supportsMediaCapability(HlsVideoMedia, 'live')).toBe(true);
    expect(supportsMediaCapability(HlsVideoMedia, 'error')).toBe(true);
  });

  it('keeps not-yet-official surface off the manifest', () => {
    // `engine` is an exposed member, but the manifest is where the official-API line is drawn.
    expect('engine' in HlsVideoMedia.prototype).toBe(true);
    expect(supportsMediaCapability(HlsVideoMedia, 'engine')).toBe(false);
  });

  it('derives the event vocabulary from the manifest', () => {
    const events = getMediaCapabilityEvents(HlsVideoMedia);

    expect(events).toContain('volumechange');
    expect(events).toContain('streamtypechange');
  });
});
