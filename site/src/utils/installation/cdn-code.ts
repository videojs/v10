import type { Renderer, Skin, UseCase } from '@/utils/installation/types';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

function getCdnFileName(useCase: UseCase, skin: Skin): string {
  if (useCase === 'background-video') return 'background';
  if (skin === 'none') return useCase === 'default-audio' ? 'audio-headless' : 'video-headless';
  if (skin === 'minimal-video') return 'video-minimal';
  if (skin === 'minimal-audio') return 'audio-minimal';
  return skin;
}

// Renderer → media subpath name, independent of whether a CDN build exists.
// Preset renderers (html5-video/audio, background-video) are covered by the
// preset bundle and have no separate media script, so they map to null.
function getMediaSubpath(renderer: Renderer): string | null {
  const map: Partial<Record<Renderer, string>> = {
    hls: 'hlsjs-video',
  };
  return map[renderer] ?? null;
}

// Whether a renderer can be installed via CDN, given the set of media subpaths
// that ship a CDN build (from the cdn-media manifest). Preset renderers always
// can (no separate media script); a media renderer can only if its subpath is
// in the manifest.
export function rendererSupportsCdn(renderer: Renderer, cdnMediaSubpaths: readonly string[]): boolean {
  const subpath = getMediaSubpath(renderer);
  return subpath === null || cdnMediaSubpaths.includes(subpath);
}

function getCdnMediaSubpath(renderer: Renderer): string | null {
  return getMediaSubpath(renderer);
}

export function generateCdnCode(useCase: UseCase, skin: Skin, renderer: Renderer): string {
  const name = getCdnFileName(useCase, skin);
  const mediaSubpath = getCdnMediaSubpath(renderer);

  const scriptLines = [`<script type="module" src="${CDN_BASE}/${name}.js"></script>`];

  if (mediaSubpath) {
    scriptLines.push(`<script type="module" src="${CDN_BASE}/media/${mediaSubpath}.js"></script>`);
  }

  return scriptLines.join('\n');
}
