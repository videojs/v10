import { describe, expect, it } from 'vite-plus/test';

import type { FeatureReference } from '@/types/feature-reference';
import type { PresetReference } from '@/types/preset-reference';

import { buildPlayerStoreReferenceTocHeadings, createPlayerStoreReferenceModel } from '../playerStoreReferenceModel';

function makeFeature(name: string, overrides: Partial<FeatureReference> = {}): FeatureReference {
  return {
    name,
    slug: name,
    docsSlug: `reference/api/feature-${name}`,
    state: {},
    actions: {},
    config: {},
    ...overrides,
  };
}

function makePreset(name: string, featureBundle: string, features: string[]): PresetReference {
  return {
    name,
    featureBundle,
    features: features.map((feature) => ({
      name: feature,
      slug: `reference/api/feature-${feature}`,
      hasReference: true,
    })),
    html: { skins: [] },
    react: { skins: [], mediaElement: 'Video' },
  };
}

const FEATURES = [
  makeFeature('volume', { state: { volume: { type: 'number' } }, actions: { setVolume: { type: '(v) => void' } } }),
  makeFeature('streamType', { state: { streamType: { type: 'MediaStreamType' } } }),
  makeFeature('playback', {
    state: { paused: { type: 'boolean' } },
    actions: { play: { type: '() => Promise<void>' } },
  }),
];

const PRESETS = [
  makePreset('live-video', 'liveVideoFeatures', ['playback', 'volume']),
  makePreset('background', 'backgroundFeatures', []),
  makePreset('audio', 'audioFeatures', ['playback', 'volume']),
  makePreset('video', 'videoFeatures', ['playback', 'volume']),
];

describe('createPlayerStoreReferenceModel', () => {
  it('orders features by name and names their exports and section ids', () => {
    const model = createPlayerStoreReferenceModel(FEATURES, PRESETS);

    expect(model.features.map(({ name, exportName, id }) => ({ name, exportName, id }))).toEqual([
      { name: 'playback', exportName: 'playbackFeature', id: 'playback-feature' },
      { name: 'streamType', exportName: 'streamTypeFeature', id: 'stream-type-feature' },
      { name: 'volume', exportName: 'volumeFeature', id: 'volume-feature' },
    ]);
  });

  it('pins video and audio before the other presets and drops presets with empty bundles', () => {
    const model = createPlayerStoreReferenceModel(FEATURES, PRESETS);

    expect(model.presets).toEqual([
      { name: 'video', featureBundle: 'videoFeatures' },
      { name: 'audio', featureBundle: 'audioFeatures' },
      { name: 'live-video', featureBundle: 'liveVideoFeatures' },
    ]);
  });

  it('lists the presets that include each feature, leaving opt-in features with none', () => {
    const model = createPlayerStoreReferenceModel(FEATURES, PRESETS);
    const presetsByFeature = Object.fromEntries(model.features.map((feature) => [feature.name, feature.presets]));

    expect(presetsByFeature).toEqual({
      playback: ['video', 'audio', 'live-video'],
      streamType: [],
      volume: ['video', 'audio', 'live-video'],
    });
  });

  it('carries each feature state, actions, and docs slug through unchanged', () => {
    const model = createPlayerStoreReferenceModel(FEATURES, PRESETS);
    const playback = model.features.find((feature) => feature.name === 'playback')!;

    expect(playback.docsSlug).toBe('reference/api/feature-playback');
    expect(playback.state).toEqual({ paused: { type: 'boolean' } });
    expect(playback.actions).toEqual({ play: { type: '() => Promise<void>' } });
  });
});

describe('buildPlayerStoreReferenceTocHeadings', () => {
  it('nests one heading per feature under the state and actions section', () => {
    const headings = buildPlayerStoreReferenceTocHeadings(createPlayerStoreReferenceModel(FEATURES, PRESETS));

    expect(headings).toEqual([
      { depth: 2, text: 'Features by preset', slug: 'features-by-preset' },
      { depth: 2, text: 'State and actions', slug: 'state-and-actions' },
      { depth: 3, text: 'playbackFeature', slug: 'playback-feature' },
      { depth: 3, text: 'streamTypeFeature', slug: 'stream-type-feature' },
      { depth: 3, text: 'volumeFeature', slug: 'volume-feature' },
    ]);
  });
});
