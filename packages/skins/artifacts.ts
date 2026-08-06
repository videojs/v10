import { type ArtifactDefinition, defineArtifact } from '@videojs/compiler/artifacts';

export type SkinArtifactKind = 'component' | 'skin' | 'preset' | 'utility' | 'theme';
export type SkinArtifactResourceKind = 'styles';
export type SkinArtifactSymbolKind = 'components' | 'icons' | 'elements';
export type SkinArtifactDefinition = Omit<ArtifactDefinition<SkinArtifactKind>, 'resources'> & {
  resources?: Readonly<Partial<Record<SkinArtifactResourceKind, readonly string[]>>> | undefined;
};

export const skinArtifacts = [
  defineArtifact({
    id: 'default-video-controls',
    kind: 'component',
    entry: './canonical/skins/default/video-controls.skin.tsx',
  }),
  defineArtifact({
    id: 'fullscreen-button',
    kind: 'component',
    entry: './canonical/components/buttons/fullscreen-button.skin.tsx',
  }),
  defineArtifact({
    id: 'mute-button',
    kind: 'component',
    entry: './canonical/components/buttons/mute-button.skin.tsx',
  }),
  defineArtifact({
    id: 'play-button',
    kind: 'component',
    entry: './canonical/components/buttons/play-button.skin.tsx',
  }),
  defineArtifact({
    id: 'seek-button',
    kind: 'component',
    entry: './canonical/components/buttons/seek-button.skin.tsx',
  }),
  defineArtifact({
    id: 'time-slider',
    kind: 'component',
    entry: './canonical/components/sliders/time-slider.skin.tsx',
  }),
  defineArtifact({
    id: 'button-tooltip',
    kind: 'component',
    entry: './canonical/components/buttons/button-tooltip.skin.tsx',
  }),
  defineArtifact({
    id: 'volume-slider',
    kind: 'component',
    entry: './canonical/components/sliders/volume-slider.skin.tsx',
  }),
  defineArtifact({
    id: 'volume-popover',
    kind: 'component',
    entry: './canonical/components/controls/volume-popover.skin.tsx',
  }),
] as const satisfies readonly SkinArtifactDefinition[];
