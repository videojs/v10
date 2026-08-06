import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BuildArtifactGraphResult, buildArtifactGraph } from '@videojs/compiler/artifacts';
import { type SkinArtifactSymbolKind, skinArtifacts } from '../artifacts';

export const skinsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const dependencyModules = {
  '@videojs/core/components': 'components',
  '@videojs/icons/components': 'icons',
} as const satisfies Readonly<Record<string, SkinArtifactSymbolKind>>;

export function buildSkinArtifactGraph(): Promise<BuildArtifactGraphResult> {
  return buildArtifactGraph(skinArtifacts, {
    rootDir: skinsRoot,
    dependencyModules,
    isArtifactEntry: (fileName) => fileName.endsWith('.skin.tsx'),
  });
}
