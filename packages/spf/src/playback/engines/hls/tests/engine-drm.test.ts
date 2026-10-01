import { describe, expect, it } from 'vite-plus/test';

import { createHlsVideoEngine } from '../engine';

describe('createHlsVideoEngine (DRM composition)', () => {
  it('materializes the DRM slots with a license-server map and destroys cleanly', async () => {
    const engine = createHlsVideoEngine({
      drm: { 'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' } },
    });

    // `setupMediaKeys` declares both slots; nothing is set before a source.
    expect(engine.state.segmentLoadingBlocked.get()).toBeUndefined();
    expect(engine.context.mediaKeys.get()).toBeUndefined();

    await engine.destroy();
  });

  it('constructs without a drm config — the degenerate empty license map', async () => {
    // Clear sources are unaffected; encrypted renditions are refused exactly
    // as before DRM composed in (pruned, with 4008 causes).
    const engine = createHlsVideoEngine();

    expect(engine.state.segmentLoadingBlocked.get()).toBeUndefined();

    await engine.destroy();
  });
});
