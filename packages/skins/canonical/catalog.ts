export interface SkinItemDefinition {
  name: string;
  source: string;
  title: string;
  description: string;
}

export interface SkinDefinition extends SkinItemDefinition {
  type: 'skin';
  scopeClass: string;
  theme: keyof SkinStyleResources['themes'];
}

export interface SkinComponent extends SkinItemDefinition {
  type: 'component';
}

export interface SkinStyleResources {
  tailwind: string;
  base: string;
  themes: Readonly<Record<string, string>>;
}

export interface SkinResources {
  styles: SkinStyleResources;
}

export type SkinDependencyKind = 'components' | 'icons';

export interface SkinCatalog {
  resources: SkinResources;
  dependencyModules: Readonly<Record<string, SkinDependencyKind>>;
  skins: readonly SkinDefinition[];
  components: readonly SkinComponent[];
}

/** Preserve literal fields while checking a Skin definition. */
export function defineSkin<const Definition extends SkinDefinition>(skin: Definition): Definition {
  return skin;
}

/** Preserve literal fields while checking a reusable Skin component definition. */
export function defineSkinComponent<const Component extends SkinComponent>(component: Component): Component {
  return component;
}

const resources = {
  styles: {
    tailwind: './styles/tailwind.css',
    base: './styles/base.css',
    themes: {
      default: './styles/themes/default.css',
      minimal: './styles/themes/minimal.css',
    },
  },
} as const;

/** Canonical Skin source catalog shared by package, registry, and future documentation outputs. */
export const skinCatalog = {
  resources,
  dependencyModules: {
    '@videojs/core/components': 'components',
    '@videojs/icons/components': 'icons',
  },
  skins: [
    defineSkin({
      name: 'default-video',
      type: 'skin',
      scopeClass: 'media-skin-video',
      theme: 'default',
      source: './skins/default-video/skin.tsx',
      title: 'Default Video Skin',
      description: 'A complete on-demand video skin with responsive controls, settings, feedback, and input bindings.',
    }),
    defineSkin({
      name: 'minimal-video',
      type: 'skin',
      scopeClass: 'media-skin-video-minimal',
      theme: 'minimal',
      source: './skins/minimal-video/skin.tsx',
      title: 'Minimal Video Skin',
      description: 'A compact on-demand video skin with wrapping controls and the complete video component set.',
    }),
  ],
  components: [
    defineSkinComponent({
      name: 'airplay-button',
      type: 'component',
      source: './components/buttons/airplay-button.tsx',
      title: 'AirPlay Button',
      description: 'A state-aware button that starts and stops AirPlay playback.',
    }),
    defineSkinComponent({
      name: 'container',
      type: 'component',
      source: './components/layout/container.tsx',
      title: 'Container',
      description: 'The player layout container shared by Skin compositions.',
    }),
    defineSkinComponent({
      name: 'overlay',
      type: 'component',
      source: './components/layout/overlay.tsx',
      title: 'Overlay',
      description: 'The inert video scrim rendered behind visible controls and feedback UI.',
    }),
    defineSkinComponent({
      name: 'poster',
      type: 'component',
      source: './components/layout/poster.tsx',
      title: 'Poster',
      description: 'The video poster and its presentation styling shared by Skin compositions.',
    }),
    defineSkinComponent({
      name: 'buffering-indicator',
      type: 'component',
      source: './components/feedback/buffering-indicator.tsx',
      title: 'Buffering Indicator',
      description: 'A delayed spinner displayed while media is waiting for data.',
    }),
    defineSkinComponent({
      name: 'error-dialog',
      type: 'component',
      source: './components/feedback/error-dialog.tsx',
      title: 'Error Dialog',
      description: 'An alert dialog that presents and dismisses playback errors.',
    }),
    defineSkinComponent({
      name: 'seek-indicator',
      type: 'component',
      source: './components/feedback/seek-indicator.tsx',
      title: 'Seek Indicator',
      description: 'Visual feedback for forward and backward seek actions.',
    }),
    defineSkinComponent({
      name: 'status-announcer',
      type: 'component',
      source: './components/feedback/status-announcer.tsx',
      title: 'Status Announcer',
      description: 'A polite live region that announces media state changes.',
    }),
    defineSkinComponent({
      name: 'status-indicator',
      type: 'component',
      source: './components/feedback/status-indicator.tsx',
      title: 'Status Indicator',
      description: 'Visual feedback for captions, fullscreen, picture-in-picture, and playback actions.',
    }),
    defineSkinComponent({
      name: 'volume-indicator',
      type: 'component',
      source: './components/feedback/volume-indicator.tsx',
      title: 'Volume Indicator',
      description: 'Visual feedback for mute and volume changes.',
    }),
    defineSkinComponent({
      name: 'fullscreen-button',
      type: 'component',
      source: './components/buttons/fullscreen-button.tsx',
      title: 'Fullscreen Button',
      description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
    }),
    defineSkinComponent({
      name: 'captions-button',
      type: 'component',
      source: './components/buttons/captions-button.tsx',
      title: 'Captions Button',
      description: 'A state-aware button that toggles captions and subtitles.',
    }),
    defineSkinComponent({
      name: 'cast-button',
      type: 'component',
      source: './components/buttons/cast-button.tsx',
      title: 'Cast Button',
      description: 'A state-aware button that starts and stops Google Cast playback.',
    }),
    defineSkinComponent({
      name: 'pip-button',
      type: 'component',
      source: './components/buttons/pip-button.tsx',
      title: 'Picture-in-Picture Button',
      description: 'A state-aware button that enters and exits picture-in-picture.',
    }),
    defineSkinComponent({
      name: 'mute-button',
      type: 'component',
      source: './components/buttons/mute-button.tsx',
      title: 'Mute Button',
      description: 'A state-aware mute button used by the volume control.',
    }),
    defineSkinComponent({
      name: 'play-button',
      type: 'component',
      source: './components/buttons/play-button.tsx',
      title: 'Play Button',
      description:
        'A three-state button that plays, pauses, or restarts media with matching icons and an accessible tooltip.',
    }),
    defineSkinComponent({
      name: 'seek-button',
      type: 'component',
      source: './components/buttons/seek-button.tsx',
      title: 'Seek Button',
      description:
        'A button that skips playback forward or backward by a configurable number of seconds, with a direction-aware icon and accessible tooltip.',
    }),
    defineSkinComponent({
      name: 'time-slider',
      type: 'component',
      source: './components/sliders/time-slider.tsx',
      title: 'Time Slider',
      description:
        'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
    }),
    defineSkinComponent({
      name: 'button-tooltip',
      type: 'component',
      source: './components/buttons/button-tooltip.tsx',
      title: 'Button Tooltip',
      description: 'An internal tooltip composition shared by button controls.',
    }),
    defineSkinComponent({
      name: 'volume-slider',
      type: 'component',
      source: './components/sliders/volume-slider.tsx',
      title: 'Volume Slider',
      description:
        'A horizontal or vertical slider for adjusting playback volume by dragging, using the keyboard, or scrolling.',
    }),
    defineSkinComponent({
      name: 'volume-popover',
      type: 'component',
      source: './components/controls/volume-popover.tsx',
      title: 'Volume Control',
      description: 'A mute toggle with a vertical slider for adjusting playback volume in a popover.',
    }),
    defineSkinComponent({
      name: 'video-settings-menu',
      type: 'component',
      source: './components/menus/video-settings-menu.tsx',
      title: 'Video Settings Menu',
      description: 'Nested video quality, audio track, playback rate, and captions settings menus.',
    }),
    defineSkinComponent({
      name: 'video-input-bindings',
      type: 'component',
      source: './components/input/video-input-bindings.tsx',
      title: 'Video Input Bindings',
      description: 'The standard keyboard and pointer bindings for on-demand video playback.',
    }),
  ],
} as const satisfies SkinCatalog;
