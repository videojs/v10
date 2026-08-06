import { resolveArtifactClosure } from '@videojs/compiler/artifacts';
import { describe, expect, it } from 'vitest';
import { buildSkinArtifactGraph } from '../build-artifact-graph';

describe('buildSkinArtifactGraph', () => {
  it('infers exact closure for canonical Skin components', async () => {
    const result = await buildSkinArtifactGraph();

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.artifacts).toMatchObject([
      {
        id: 'button-tooltip',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core'],
          symbols: {
            components: ['Tooltip'],
          },
        },
      },
      {
        id: 'default-video-controls',
        dependencies: {
          artifacts: ['fullscreen-button', 'play-button', 'seek-button', 'time-slider'],
          packages: ['@videojs/core'],
          symbols: {
            components: ['Controls', 'Time', 'Tooltip'],
            icons: [],
          },
        },
      },
      {
        id: 'fullscreen-button',
        dependencies: {
          artifacts: ['button-tooltip'],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['FullscreenButton'],
            icons: ['FullscreenEnterIcon', 'FullscreenExitIcon'],
          },
        },
      },
      {
        id: 'play-button',
        dependencies: {
          artifacts: ['button-tooltip'],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['PlayButton'],
            icons: ['PauseIcon', 'PlayIcon', 'RestartIcon'],
          },
        },
      },
      {
        id: 'seek-button',
        dependencies: {
          artifacts: ['button-tooltip'],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['SeekButton', 'Text'],
            icons: ['SeekIcon'],
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

    expect(resolveArtifactClosure(result.graph, 'default-video-controls')).toMatchObject({
      artifactIds: [
        'button-tooltip',
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-slider',
        'default-video-controls',
      ],
      artifacts: ['button-tooltip', 'fullscreen-button', 'play-button', 'seek-button', 'time-slider'],
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
