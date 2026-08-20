import { describe, expect, it } from 'vitest';
import { createDrmHlsVideoEngine, type DrmHlsVideoEngineSignals } from '../engine-drm';

describe('createDrmHlsVideoEngine', () => {
  it('constructs with a license-server map, materializes the DRM slots, and destroys cleanly', async () => {
    let signals: DrmHlsVideoEngineSignals | undefined;
    const engine = createDrmHlsVideoEngine({
      drm: { 'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' } },
      onSignalsReady: (refs) => {
        signals = refs;
      },
    });

    expect(signals).toBeDefined();
    // `setupMediaKeys` declares both slots; nothing is set before a source.
    expect(signals!.state.awaitingMediaKeys.get()).toBeUndefined();
    expect(signals!.context.mediaKeys.get()).toBeUndefined();

    await engine.destroy();
  });
});
