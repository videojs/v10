import { defineArtifact } from '@videojs/compiler';

export const skinArtifacts = [
  defineArtifact({
    id: 'play-button',
    kind: 'component',
    entry: './canonical/components/buttons/play-button.skin.tsx',
  }),
  defineArtifact({
    id: 'time-slider',
    kind: 'component',
    entry: './canonical/components/sliders/time-slider.skin.tsx',
  }),
  defineArtifact({
    id: 'volume-slider',
    kind: 'component',
    entry: './canonical/components/sliders/volume-slider.skin.tsx',
  }),
] as const;
