import { defineRegistryItem, type RegistryDefinition } from './types';

const resources = {
  styles: ['./canonical/styles/tailwind.css', './canonical/styles/base.css', './canonical/styles/themes/default.css'],
} as const;

export const registry = {
  resources,
  dependencyModules: {
    '@videojs/core/components': 'components',
    '@videojs/icons/components': 'icons',
  },
  items: [
    defineRegistryItem({
      name: 'default-video',
      type: 'skin',
      source: './canonical/skins/default-video/skin.tsx',
      title: 'Default Video Skin',
      description:
        'A video skin with play, seek, current and remaining time, volume, fullscreen, tooltips, and thumbnail previews.',
      targets: ['html', 'react'],
    }),
    defineRegistryItem({
      name: 'fullscreen-button',
      type: 'component',
      source: './canonical/components/buttons/fullscreen-button.skin.tsx',
      title: 'Fullscreen Button',
      description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
      targets: ['react'],
    }),
    defineRegistryItem({
      name: 'mute-button',
      type: 'component',
      source: './canonical/components/buttons/mute-button.skin.tsx',
      internal: true,
    }),
    defineRegistryItem({
      name: 'play-button',
      type: 'component',
      source: './canonical/components/buttons/play-button.skin.tsx',
      title: 'Play Button',
      description:
        'A three-state button that plays, pauses, or restarts media with matching icons and an accessible tooltip.',
      targets: ['react'],
    }),
    defineRegistryItem({
      name: 'seek-button',
      type: 'component',
      source: './canonical/components/buttons/seek-button.skin.tsx',
      title: 'Seek Button',
      description:
        'A button that skips playback forward or backward by a configurable number of seconds, with a direction-aware icon and accessible tooltip.',
      targets: ['react'],
    }),
    defineRegistryItem({
      name: 'time-slider',
      type: 'component',
      source: './canonical/components/sliders/time-slider.skin.tsx',
      title: 'Time Slider',
      description:
        'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
      targets: ['react'],
    }),
    defineRegistryItem({
      name: 'button-tooltip',
      type: 'component',
      source: './canonical/components/buttons/button-tooltip.skin.tsx',
      internal: true,
    }),
    defineRegistryItem({
      name: 'volume-slider',
      type: 'component',
      source: './canonical/components/sliders/volume-slider.skin.tsx',
      title: 'Volume Slider',
      description:
        'A horizontal or vertical slider for adjusting playback volume by dragging, using the keyboard, or scrolling.',
      targets: ['react'],
    }),
    defineRegistryItem({
      name: 'volume-popover',
      type: 'component',
      source: './canonical/components/controls/volume-popover.skin.tsx',
      title: 'Volume Control',
      description: 'A mute toggle with a vertical slider for adjusting playback volume in a popover.',
      targets: ['react'],
    }),
  ],
} as const satisfies RegistryDefinition;
