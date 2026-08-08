import { type ArtifactGraph, resolveArtifactClosure } from '@videojs/compiler/artifacts';

export interface SkinSourcePreset {
  slug: string;
  rootArtifactId: string;
  artifactIds: readonly string[];
}

export const defaultVideoSourcePreset = {
  slug: 'default-video',
  rootArtifactId: 'default-video-controls',
} as const;

/** Resolve the canonical artifact closure that constitutes the default video Skin. */
export function createDefaultVideoSourcePreset(graph: ArtifactGraph): SkinSourcePreset {
  return {
    ...defaultVideoSourcePreset,
    artifactIds: [...resolveArtifactClosure(graph, defaultVideoSourcePreset.rootArtifactId).artifactIds],
  };
}
