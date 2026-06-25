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
    dash: 'dash-video',
    'mux-video': 'mux-video',
    'mux-audio': 'mux-audio',
    vimeo: 'vimeo-video',
  };
  return map[renderer] ?? null;
}

// Whether a renderer can be installed via CDN, given the set of media subpaths
// that ship a CDN build (from the cdn-media manifest). Preset renderers always
// can (no separate media script); media renderers can only if their subpath is
// in the manifest. Vimeo has no CDN build, so it resolves to false.
export function rendererSupportsCdn(renderer: Renderer, cdnMediaSubpaths: readonly string[]): boolean {
  const subpath = getMediaSubpath(renderer);
  return subpath === null || cdnMediaSubpaths.includes(subpath);
}

// The media subpath to load via CDN, or null when none is needed. Vimeo has no
// CDN build; the install UI hides the CDN option when it's selected, so this is
// never reached for it, but we guard here too.
function getCdnMediaSubpath(renderer: Renderer): string | null {
  if (renderer === 'vimeo') return null;
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
