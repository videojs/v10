import { type ArtifactDefinition, defineArtifact } from '@videojs/compiler/artifacts';

export type SkinArtifactKind = 'component' | 'skin' | 'preset' | 'utility' | 'theme';
export type SkinArtifactResourceKind = 'styles';
export type SkinArtifactSymbolKind = 'components' | 'icons' | 'elements';
export interface SkinRegistryMetadata {
  title: string;
  description: string;
}

export type SkinArtifactDefinition = Omit<ArtifactDefinition<SkinArtifactKind>, 'resources' | 'metadata'> & {
  resources?: Readonly<Partial<Record<SkinArtifactResourceKind, readonly string[]>>> | undefined;
  metadata?: { readonly registry?: SkinRegistryMetadata | undefined } | undefined;
};

const coreStyleResources = {
  styles: ['./canonical/styles/tailwind.css', './canonical/styles/base.css', './canonical/styles/themes/default.css'],
} as const;

export const skinArtifacts = [
  defineArtifact({
    id: 'default-video-controls',
    kind: 'skin',
    entry: './canonical/skins/default/video-controls.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Core Video Controls',
        description:
          'A video control bar with play, seek, current and remaining time, volume, fullscreen, tooltips, and thumbnail previews.',
      },
    },
  }),
  defineArtifact({
    id: 'fullscreen-button',
    kind: 'component',
    entry: './canonical/components/buttons/fullscreen-button.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Fullscreen Button',
        description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
      },
    },
  }),
  defineArtifact({
    id: 'mute-button',
    kind: 'component',
    entry: './canonical/components/buttons/mute-button.skin.tsx',
    resources: coreStyleResources,
  }),
  defineArtifact({
    id: 'play-button',
    kind: 'component',
    entry: './canonical/components/buttons/play-button.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Play Button',
        description:
          'A three-state button that plays, pauses, or restarts media with matching icons and an accessible tooltip.',
      },
    },
  }),
  defineArtifact({
    id: 'seek-button',
    kind: 'component',
    entry: './canonical/components/buttons/seek-button.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Seek Button',
        description:
          'A button that skips playback forward or backward by a configurable number of seconds, with a direction-aware icon and accessible tooltip.',
      },
    },
  }),
  defineArtifact({
    id: 'time-slider',
    kind: 'component',
    entry: './canonical/components/sliders/time-slider.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Time Slider',
        description:
          'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
      },
    },
  }),
  defineArtifact({
    id: 'button-tooltip',
    kind: 'component',
    entry: './canonical/components/buttons/button-tooltip.skin.tsx',
    resources: coreStyleResources,
  }),
  defineArtifact({
    id: 'volume-slider',
    kind: 'component',
    entry: './canonical/components/sliders/volume-slider.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Volume Slider',
        description:
          'A horizontal or vertical slider for adjusting playback volume by dragging, using the keyboard, or scrolling.',
      },
    },
  }),
  defineArtifact({
    id: 'volume-popover',
    kind: 'component',
    entry: './canonical/components/controls/volume-popover.skin.tsx',
    resources: coreStyleResources,
    metadata: {
      registry: {
        title: 'Volume Control',
        description: 'A mute toggle with a vertical slider for adjusting playback volume in a popover.',
      },
    },
  }),
] as const satisfies readonly SkinArtifactDefinition[];
