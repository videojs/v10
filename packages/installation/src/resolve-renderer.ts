import { type MediaSourceKind, resolveSourceKind } from '@videojs/media';

import type { UseCase } from './presets';
import { getInstallationPreset } from './presets';
import { getInstallationRenderer, type Renderer } from './renderers';

// Candidate order within a kind lets the selected use case choose video, audio, or background playback.
const SOURCE_KIND_RENDERERS: Record<MediaSourceKind, readonly Renderer[]> = {
  youtube: ['youtube'],
  vimeo: ['vimeo'],
  // No Wistia renderer is offered yet.
  wistia: [],
  mux: ['mux-video', 'mux-audio', 'mux-background-video'],
  cloudflare: ['cloudflare'],
  spotify: ['spotify'],
  tiktok: ['tiktok'],
  twitch: ['twitch'],
  hls: ['hls', 'hls-background-video'],
  dash: ['dash'],
  video: ['html5-video', 'background-video'],
  audio: ['html5-audio'],
};

/** Renderers whose accepted source shape matches a URL, ordered from provider-specific to generic. */
export function resolveRendererCandidates(url: string): readonly Renderer[] {
  const kind = resolveSourceKind(url);
  if (!kind) return [];

  // A provider's manifest, such as a Mux or Cloudflare `.m3u8`, also plays in the generic stream renderers. The file
  // name alone carries no host, so it resolves by extension.
  const fileName = url.split(/[?#]/, 1)[0]!.split('/').pop();
  const fileKind = fileName ? resolveSourceKind(fileName) : null;

  return [...new Set([...SOURCE_KIND_RENDERERS[kind], ...(fileKind ? SOURCE_KIND_RENDERERS[fileKind] : [])])];
}

/** The first renderer for a URL that the use case offers. */
export function resolveRenderer(url: string, useCase: UseCase): Renderer | null {
  return resolveRendererCandidates(url).find((candidate) => isRendererValidForUseCase(candidate, useCase)) ?? null;
}

export function isRendererValidForUseCase(renderer: Renderer, useCase: UseCase): boolean {
  return getInstallationPreset(useCase).renderers.includes(renderer);
}

export function articleFor(renderer: Renderer): 'a' | 'an' {
  return getInstallationRenderer(renderer).article;
}
