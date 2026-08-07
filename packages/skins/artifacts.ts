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
        title: 'Default Video Controls',
        description: 'Source-owned core controls for a Video.js video player.',
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
        description: 'A source-owned Video.js fullscreen button with a shared button tooltip.',
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
        description: 'A source-owned Video.js play button with play, pause, and replay states.',
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
        description: 'A source-owned Video.js button for seeking backward or forward.',
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
        description: 'A source-owned Video.js timeline with seek preview and thumbnails.',
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
        description: 'A source-owned Video.js volume slider.',
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
        title: 'Volume Popover',
        description: 'Source-owned Video.js mute and volume controls in a popover.',
      },
    },
  }),
] as const satisfies readonly SkinArtifactDefinition[];
