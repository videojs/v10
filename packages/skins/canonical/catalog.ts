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
    themes: { default: './styles/themes/default.css' },
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
      description:
        'A video skin with play, seek, current and remaining time, volume, fullscreen, tooltips, and thumbnail previews.',
    }),
  ],
  components: [
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
      name: 'fullscreen-button',
      type: 'component',
      source: './components/buttons/fullscreen-button.tsx',
      title: 'Fullscreen Button',
      description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
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
  ],
} as const satisfies SkinCatalog;
