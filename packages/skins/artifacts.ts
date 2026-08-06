import { type ArtifactDefinition, defineArtifact } from '@videojs/compiler/artifacts';

export type SkinArtifactKind = 'component' | 'skin' | 'preset' | 'utility' | 'theme';
export type SkinArtifactResourceKind = 'styles';
export type SkinArtifactSymbolKind = 'components' | 'icons' | 'elements';
export type SkinArtifactDefinition = Omit<ArtifactDefinition<SkinArtifactKind>, 'resources'> & {
  resources?: Readonly<Partial<Record<SkinArtifactResourceKind, readonly string[]>>> | undefined;
};

const coreStyleResources = {
  styles: ['./canonical/styles/tailwind.css', './canonical/styles/base.css', './canonical/styles/themes/default.css'],
} as const;

export const skinArtifacts = [
  defineArtifact({
    id: 'default-video-controls',
    kind: 'component',
    entry: './canonical/skins/default/video-controls.skin.tsx',
    resources: coreStyleResources,
  }),
  defineArtifact({
    id: 'fullscreen-button',
    kind: 'component',
    entry: './canonical/components/buttons/fullscreen-button.skin.tsx',
    resources: coreStyleResources,
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
  }),
  defineArtifact({
    id: 'seek-button',
    kind: 'component',
    entry: './canonical/components/buttons/seek-button.skin.tsx',
    resources: coreStyleResources,
  }),
  defineArtifact({
    id: 'time-slider',
    kind: 'component',
    entry: './canonical/components/sliders/time-slider.skin.tsx',
    resources: coreStyleResources,
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
  }),
  defineArtifact({
    id: 'volume-popover',
    kind: 'component',
    entry: './canonical/components/controls/volume-popover.skin.tsx',
    resources: coreStyleResources,
  }),
] as const satisfies readonly SkinArtifactDefinition[];
