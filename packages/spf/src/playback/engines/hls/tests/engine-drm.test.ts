import { describe, expect, it } from 'vite-plus/test';

import { createHlsVideoEngine, type HlsVideoEngineSignals } from '../engine';

describe('createHlsVideoEngine (DRM composition)', () => {
  it('materializes the DRM slots with a license-server map and destroys cleanly', async () => {
    let signals: HlsVideoEngineSignals | undefined;
    const engine = createHlsVideoEngine({
      drm: { 'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' } },
      onSignalsReady: (refs) => {
        signals = refs;
      },
    });

    expect(signals).toBeDefined();
    // `setupMediaKeys` declares both slots; nothing is set before a source.
    expect(signals!.state.segmentLoadingBlocked.get()).toBeUndefined();
    expect(signals!.context.mediaKeys.get()).toBeUndefined();

    await engine.destroy();
  });

  it('constructs without a drm config — the degenerate empty license map', async () => {
    // Clear sources are unaffected; encrypted renditions are refused exactly
    // as before DRM composed in (pruned, with 4008 causes).
    let signals: HlsVideoEngineSignals | undefined;
    const engine = createHlsVideoEngine({
      onSignalsReady: (refs) => {
        signals = refs;
      },
    });

    expect(signals!.state.segmentLoadingBlocked.get()).toBeUndefined();

    await engine.destroy();
  });
});
