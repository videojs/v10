import { schema } from '@videojs/core/vjsc';
import { defineCatalog } from 'vjsc/catalog';

const resources = {
  styles: {
    tailwind: {
      compiler: './styles/tailwind.css',
      registry: './styles/tailwind.registry.css',
      shared: './styles/tailwind.shared.css',
    },
    base: './styles/base.css',
    shared: ['./styles/captions.css', './styles/themes/video.css'],
    themes: {
      default: './styles/themes/default.css',
      minimal: './styles/themes/minimal.css',
    },
  },
} as const;

/** Canonical Skin source catalog shared by package, registry, and future documentation outputs. */
export const skinCatalog = defineCatalog({
  components: [schema.source, '@videojs/icons/vjsc'],
  resources,
  allowedImports: [
    '@videojs/core',
    '@videojs/utils/style',
    'vjsc/styles',
    'vjsc/components',
    /^@videojs\/core\/i18n\/text\//,
  ],
  imports: {
    '@videojs/core/vjsc': 'components',
    '@videojs/icons/vjsc': 'icons',
  },
  items: [
    {
      name: 'default-video',
      type: 'skin',
      style: {
        scope: 'media-skin-video',
        theme: 'default',
        variant: 'default',
      },
      source: './skins/default-video/skin.tsx',
      title: 'Default Video Skin',
      description: 'A complete on-demand video skin with responsive controls, settings, feedback, and input controls.',
    },
    {
      name: 'minimal-video',
      type: 'skin',
      style: {
        scope: 'media-skin-video-minimal',
        theme: 'minimal',
        variant: 'minimal',
      },
      source: './skins/minimal-video/skin.tsx',
      title: 'Minimal Video Skin',
      description: 'A compact on-demand video skin with wrapping controls and the complete video component set.',
    },
    {
      name: 'airplay-button',
      type: 'component',
      source: './components/buttons/airplay-button.tsx',
      title: 'AirPlay Button',
      description: 'A state-aware button that starts and stops AirPlay playback.',
    },
    {
      name: 'container',
      type: 'component',
      source: './components/layout/container.tsx',
      title: 'Container',
      description: 'The player layout container shared by Skin compositions.',
    },
    {
      name: 'overlay',
      type: 'component',
      source: './components/layout/overlay.tsx',
      title: 'Overlay',
      description: 'The inert video scrim rendered behind visible controls and feedback UI.',
    },
    {
      name: 'poster',
      type: 'component',
      source: './components/layout/poster.tsx',
      title: 'Poster',
      description: 'The video poster and its presentation styling shared by Skin compositions.',
    },
    {
      name: 'buffering-indicator',
      type: 'component',
      source: './components/feedback/buffering-indicator.tsx',
      title: 'Buffering Indicator',
      description: 'A delayed spinner displayed while media is waiting for data.',
    },
    {
      name: 'error-dialog',
      type: 'component',
      source: './components/feedback/error-dialog.tsx',
      title: 'Error Dialog',
      description: 'An alert dialog that presents and dismisses playback errors.',
    },
    {
      name: 'seek-indicator',
      type: 'component',
      source: './components/feedback/seek-indicator.tsx',
      title: 'Seek Indicator',
      description: 'Visual feedback for forward and backward seek actions.',
    },
    {
      name: 'status-announcer',
      type: 'component',
      source: './components/feedback/status-announcer.tsx',
      title: 'Status Announcer',
      description: 'A polite live region that announces media state changes.',
    },
    {
      name: 'status-indicator',
      type: 'component',
      source: './components/feedback/status-indicator.tsx',
      title: 'Status Indicator',
      description: 'Visual feedback for captions, fullscreen, picture-in-picture, and playback actions.',
    },
    {
      name: 'volume-indicator',
      type: 'component',
      source: './components/feedback/volume-indicator.tsx',
      title: 'Volume Indicator',
      description: 'Visual feedback for mute and volume changes.',
    },
    {
      name: 'fullscreen-button',
      type: 'component',
      source: './components/buttons/fullscreen-button.tsx',
      title: 'Fullscreen Button',
      description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
    },
    {
      name: 'captions-button',
      type: 'component',
      source: './components/buttons/captions-button.tsx',
      title: 'Captions Button',
      description: 'A state-aware button that toggles captions and subtitles.',
    },
    {
      name: 'cast-button',
      type: 'component',
      source: './components/buttons/cast-button.tsx',
      title: 'Cast Button',
      description: 'A state-aware button that starts and stops Google Cast playback.',
    },
    {
      name: 'pip-button',
      type: 'component',
      source: './components/buttons/pip-button.tsx',
      title: 'Picture-in-Picture Button',
      description: 'A state-aware button that enters and exits picture-in-picture.',
    },
    {
      name: 'mute-button',
      type: 'component',
      source: './components/buttons/mute-button.tsx',
      title: 'Mute Button',
      description: 'A state-aware mute button used by the volume control.',
    },
    {
      name: 'play-button',
      type: 'component',
      source: './components/buttons/play-button.tsx',
      title: 'Play Button',
      description:
        'A three-state button that plays, pauses, or restarts media with matching icons and an accessible tooltip.',
    },
    {
      name: 'seek-button',
      type: 'component',
      source: './components/buttons/seek-button.tsx',
      title: 'Seek Button',
      description:
        'A button that skips playback forward or backward by a configurable number of seconds, with a direction-aware icon and accessible tooltip.',
    },
    {
      name: 'time-slider',
      type: 'component',
      source: './components/sliders/time-slider.tsx',
      title: 'Time Slider',
      description:
        'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
    },
    {
      name: 'button-tooltip',
      type: 'component',
      source: './components/buttons/button-tooltip.tsx',
      title: 'Button Tooltip',
      description: 'An internal tooltip composition shared by button controls.',
    },
    {
      name: 'volume-slider',
      type: 'component',
      source: './components/sliders/volume-slider.tsx',
      title: 'Volume Slider',
      description:
        'A horizontal or vertical slider for adjusting playback volume by dragging, using the keyboard, or scrolling.',
    },
    {
      name: 'volume-popover',
      type: 'component',
      source: './components/controls/volume-popover.tsx',
      title: 'Volume Control',
      description: 'A mute toggle with a vertical slider for adjusting playback volume in a popover.',
    },
    {
      name: 'video-settings-menu',
      type: 'component',
      source: './components/menus/video-settings-menu.tsx',
      title: 'Video Settings Menu',
      description: 'Nested video quality, audio track, playback rate, and captions settings menus.',
    },
    {
      name: 'video-hotkeys',
      type: 'component',
      source: './components/video-hotkeys.tsx',
      title: 'Video Hotkeys',
      description: 'The standard keyboard controls for on-demand video playback.',
    },
    {
      name: 'video-gestures',
      type: 'component',
      source: './components/video-gestures.tsx',
      title: 'Video Gestures',
      description: 'The standard pointer gestures for on-demand video playback.',
    },
  ],
});

export type SkinItemName = (typeof skinCatalog.items)[number]['name'];
export type SkinName = Extract<(typeof skinCatalog.items)[number], { readonly type: 'skin' }>['name'];
