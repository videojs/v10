import { resolveArtifactClosure } from '@videojs/compiler/artifacts';
import { describe, expect, it } from 'vitest';
import { buildSkinArtifactGraph } from '../build-artifact-graph';

describe('buildSkinArtifactGraph', () => {
  it('infers exact closure for canonical Skin components', async () => {
    const result = await buildSkinArtifactGraph();

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.artifacts).toMatchObject([
      {
        id: 'core-video-controls',
        dependencies: {
          artifacts: ['fullscreen-button', 'play-button', 'seek-button', 'time-controls', 'time-slider'],
          packages: ['@videojs/core'],
          symbols: {
            components: ['Controls', 'Tooltip'],
            icons: [],
          },
        },
      },
      {
        id: 'fullscreen-button',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['FullscreenButton', 'Tooltip'],
            icons: ['FullscreenEnterIcon', 'FullscreenExitIcon'],
          },
        },
      },
      {
        id: 'play-button',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['PlayButton', 'Tooltip'],
            icons: ['PauseIcon', 'PlayIcon', 'RestartIcon'],
          },
        },
      },
      {
        id: 'seek-button',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['SeekButton', 'Text', 'Tooltip'],
            icons: ['SeekIcon'],
          },
        },
      },
      {
        id: 'time-controls',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core'],
          symbols: {
            components: ['Time'],
          },
        },
      },
      {
        id: 'time-slider',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core'],
          symbols: {
            components: ['Slider', 'TimeSlider'],
          },
        },
      },
      {
        id: 'volume-slider',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core'],
          symbols: {
            components: ['VolumeSlider'],
          },
        },
      },
    ]);

    expect(resolveArtifactClosure(result.graph, 'core-video-controls')).toMatchObject({
      artifactIds: [
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-controls',
        'time-slider',
        'core-video-controls',
      ],
      artifacts: ['fullscreen-button', 'play-button', 'seek-button', 'time-controls', 'time-slider'],
      packages: ['@videojs/core', '@videojs/icons'],
      symbols: {
        components: [
          'Controls',
          'FullscreenButton',
          'PlayButton',
          'SeekButton',
          'Slider',
          'Text',
          'Time',
          'TimeSlider',
          'Tooltip',
        ],
        icons: ['FullscreenEnterIcon', 'FullscreenExitIcon', 'PauseIcon', 'PlayIcon', 'RestartIcon', 'SeekIcon'],
      },
    });
  });
});
