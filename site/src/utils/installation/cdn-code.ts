import { getMediaSubpath, type Renderer, type Skin, type UseCase } from '@/utils/installation/types';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

function getCdnFileName(useCase: UseCase, skin: Skin): string {
  if (useCase === 'background-video') return 'background';
  if (skin === 'none') return useCase === 'default-audio' ? 'audio-headless' : 'video-headless';
  if (skin === 'minimal-video') return 'video-minimal';
  if (skin === 'minimal-audio') return 'audio-minimal';
  return skin;
}

// Whether a renderer can be installed via CDN, given the set of media subpaths
// that ship a CDN build (from the cdn-media manifest). Preset renderers always
// can (no separate media script); media renderers can only if their subpath is
// in the manifest.
export function rendererSupportsCdn(renderer: Renderer, cdnMediaSubpaths: readonly string[]): boolean {
  const subpath = getMediaSubpath(renderer);
  return subpath === null || cdnMediaSubpaths.includes(subpath);
}

export function generateCdnCode(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  cdnMediaSubpaths: readonly string[]
): string {
  const name = getCdnFileName(useCase, skin);
  const mediaSubpath = getMediaSubpath(renderer);

  const scriptLines = [`<script type="module" src="${CDN_BASE}/${name}.js"></script>`];

  // Emit a media script only when that media ships a CDN build, per the
  // manifest. A media renderer whose subpath isn't in the manifest gets just the
  // preset script; if it gains a CDN build later, the manifest carries it and
  // this starts emitting automatically — no code change needed.
  if (mediaSubpath !== null && cdnMediaSubpaths.includes(mediaSubpath)) {
    scriptLines.push(`<script type="module" src="${CDN_BASE}/media/${mediaSubpath}.js"></script>`);
  }

  return scriptLines.join('\n');
}
