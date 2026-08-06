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
          artifacts: ['fullscreen-button', 'play-button', 'seek-button', 'time-slider', 'volume-popover'],
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
        id: 'mute-button',
        dependencies: {
          artifacts: [],
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['MuteButton'],
            icons: ['VolumeHighIcon', 'VolumeLowIcon', 'VolumeOffIcon'],
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
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['Slider', 'TimeSlider'],
            icons: ['SpinnerIcon'],
          },
        },
      },
      {
        id: 'volume-popover',
        dependencies: {
          artifacts: ['mute-button', 'volume-slider'],
          packages: ['@videojs/core'],
          symbols: {
            components: ['Popover'],
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
        'mute-button',
        'volume-slider',
        'volume-popover',
        'default-video-controls',
      ],
      artifacts: [
        'button-tooltip',
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-slider',
        'mute-button',
        'volume-slider',
        'volume-popover',
      ],
      packages: ['@videojs/core', '@videojs/icons'],
      resources: {
        styles: [
          './canonical/styles/base.css',
          './canonical/styles/tailwind.css',
          './canonical/styles/themes/default.css',
        ],
      },
      symbols: {
        components: [
          'Controls',
          'FullscreenButton',
          'MuteButton',
          'PlayButton',
          'Popover',
          'SeekButton',
          'Slider',
          'Text',
          'Time',
          'TimeSlider',
          'Tooltip',
          'VolumeSlider',
        ],
        icons: [
          'FullscreenEnterIcon',
          'FullscreenExitIcon',
          'PauseIcon',
          'PlayIcon',
          'RestartIcon',
          'SeekIcon',
          'SpinnerIcon',
          'VolumeHighIcon',
          'VolumeLowIcon',
          'VolumeOffIcon',
        ],
      },
    });
  });
});
