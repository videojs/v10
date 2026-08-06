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
          artifacts: [
            'fullscreen-button',
            'play-button',
            'seek-button',
            'time-controls',
            'time-slider',
            'volume-control',
          ],
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
          packages: ['@videojs/core', '@videojs/icons'],
          symbols: {
            components: ['Slider', 'TimeSlider'],
            icons: ['SpinnerIcon'],
          },
        },
      },
      {
        id: 'volume-control',
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

    expect(resolveArtifactClosure(result.graph, 'core-video-controls')).toMatchObject({
      artifactIds: [
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-controls',
        'time-slider',
        'mute-button',
        'volume-slider',
        'volume-control',
        'core-video-controls',
      ],
      artifacts: [
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-controls',
        'time-slider',
        'mute-button',
        'volume-slider',
        'volume-control',
      ],
      packages: ['@videojs/core', '@videojs/icons'],
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
