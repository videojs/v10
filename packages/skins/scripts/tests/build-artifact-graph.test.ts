import { describe, expect, it } from 'vitest';
import { buildSkinArtifactGraph } from '../build-artifact-graph';

describe('buildSkinArtifactGraph', () => {
  it('infers exact closure for canonical Skin components', async () => {
    const result = await buildSkinArtifactGraph();

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.artifacts).toMatchObject([
      {
        id: 'play-button',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core', '@videojs/icons'],
          components: ['PlayButton', 'Tooltip'],
          icons: ['PauseIcon', 'PlayIcon', 'RestartIcon'],
          elements: [],
        },
      },
      {
        id: 'time-slider',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core'],
          components: ['Slider', 'TimeSlider'],
          icons: [],
          elements: [],
        },
      },
      {
        id: 'volume-slider',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core'],
          components: ['VolumeSlider'],
          icons: [],
          elements: [],
        },
      },
    ]);
  });
});
