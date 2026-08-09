export interface SkinDefinition {
  name: string;
  type: 'skin';
  source: string;
  title: string;
  description: string;
}

export interface SkinComponent {
  name: string;
  type: 'component';
  source: string;
  title: string;
  description: string;
}

export interface SkinManifest {
  resources: Readonly<Record<string, readonly string[]>>;
  dependencyModules: Readonly<Record<string, string>>;
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
  styles: ['./canonical/styles/tailwind.css', './canonical/styles/base.css', './canonical/styles/themes/default.css'],
} as const;

/** Canonical Skin source inventory shared by package, registry, and future documentation outputs. */
export const skinManifest = {
  resources,
  dependencyModules: {
    '@videojs/core/components': 'components',
    '@videojs/icons/components': 'icons',
  },
  skins: [
    defineSkin({
      name: 'default-video',
      type: 'skin',
      source: './canonical/skins/default-video/skin.tsx',
      title: 'Default Video Skin',
      description:
        'A video skin with play, seek, current and remaining time, volume, fullscreen, tooltips, and thumbnail previews.',
    }),
  ],
  components: [
    defineSkinComponent({
      name: 'fullscreen-button',
      type: 'component',
      source: './canonical/components/buttons/fullscreen-button.tsx',
      title: 'Fullscreen Button',
      description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
    }),
    defineSkinComponent({
      name: 'mute-button',
      type: 'component',
      source: './canonical/components/buttons/mute-button.tsx',
      title: 'Mute Button',
      description: 'A state-aware mute button used by the volume control.',
    }),
    defineSkinComponent({
      name: 'play-button',
      type: 'component',
      source: './canonical/components/buttons/play-button.tsx',
      title: 'Play Button',
      description:
        'A three-state button that plays, pauses, or restarts media with matching icons and an accessible tooltip.',
    }),
    defineSkinComponent({
      name: 'seek-button',
      type: 'component',
      source: './canonical/components/buttons/seek-button.tsx',
      title: 'Seek Button',
      description:
        'A button that skips playback forward or backward by a configurable number of seconds, with a direction-aware icon and accessible tooltip.',
    }),
    defineSkinComponent({
      name: 'time-slider',
      type: 'component',
      source: './canonical/components/sliders/time-slider.tsx',
      title: 'Time Slider',
      description:
        'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
    }),
    defineSkinComponent({
      name: 'button-tooltip',
      type: 'component',
      source: './canonical/components/buttons/button-tooltip.tsx',
      title: 'Button Tooltip',
      description: 'An internal tooltip composition shared by button controls.',
    }),
    defineSkinComponent({
      name: 'volume-slider',
      type: 'component',
      source: './canonical/components/sliders/volume-slider.tsx',
      title: 'Volume Slider',
      description:
        'A horizontal or vertical slider for adjusting playback volume by dragging, using the keyboard, or scrolling.',
    }),
    defineSkinComponent({
      name: 'volume-popover',
      type: 'component',
      source: './canonical/components/controls/volume-popover.tsx',
      title: 'Volume Control',
      description: 'A mute toggle with a vertical slider for adjusting playback volume in a popover.',
    }),
  ],
} as const satisfies SkinManifest;
