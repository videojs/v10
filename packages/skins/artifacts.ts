import { defineArtifact } from '@videojs/compiler';

export const skinArtifacts = [
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
