import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BuildArtifactGraphResult, buildArtifactGraph } from '@videojs/compiler';
import { skinArtifacts } from '../artifacts';

export const skinsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function buildSkinArtifactGraph(): Promise<BuildArtifactGraphResult> {
  return buildArtifactGraph(skinArtifacts, {
    rootDir: skinsRoot,
    dependencyModules: {
      '@videojs/core/components': 'component',
      '@videojs/icons/components': 'icon',
    },
    isArtifactEntry: (fileName) => fileName.endsWith('.skin.tsx'),
  });
}
