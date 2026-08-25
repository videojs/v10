import { VJS10_HTML_CDN_BASE } from '@/consts';
import {
  getInstallationPreset,
  getMediaSubpath,
  RENDERERS,
  type Renderer,
  type Skin,
  type UseCase,
} from '@/utils/installation/types';

// Every installation preset ships default, minimal, and skinless CDN bundles.
// The skinless bundle is named for the element it defines (e.g. `video-player`).
// Background video is the exception: all skin choices resolve to one bundle.
function getCdnFileName(useCase: UseCase, skin: Skin): string {
  const { group } = getInstallationPreset(useCase);

  if (useCase === 'background-video') return group;

  if (skin === 'none') return `${group}-player`;

  if (skin === 'minimal-video' || skin === 'minimal-audio') return `${group}-minimal`;

  return group;
}

// Whether a renderer can be installed via CDN, given the set of media subpaths
// that ship a CDN build (from the cdn-media manifest). Preset renderers always
// can (no separate media script); media renderers can only if their subpath is
// in the manifest.
export function rendererSupportsCdn(renderer: Renderer, cdnMediaSubpaths: readonly string[]): boolean {
  const subpath = getMediaSubpath(renderer);

  return subpath === null || cdnMediaSubpaths.includes(subpath);
}

// Renderers with no CDN install path at all, given the manifest. Prose that
// needs to name them reads this instead of listing them, so a media type that
// gains a CDN bundle drops out of the docs with the manifest and no edit.
export function renderersWithoutCdn(cdnMediaSubpaths: readonly string[]): Renderer[] {
  return RENDERERS.filter((renderer) => !rendererSupportsCdn(renderer, cdnMediaSubpaths));
}

export function generateCdnCode(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  cdnMediaSubpaths: readonly string[]
): string {
  const name = getCdnFileName(useCase, skin);
  const mediaSubpath = getMediaSubpath(renderer);

  const scriptLines = [`<script type="module" src="${VJS10_HTML_CDN_BASE}/${name}.js"></script>`];

  // Emit a media script only when that media ships a CDN build, per the
  // manifest. A media renderer whose subpath isn't in the manifest gets just the
  // preset script; if it gains a CDN build later, the manifest carries it and
  // this starts emitting automatically — no code change needed.
  if (mediaSubpath !== null && cdnMediaSubpaths.includes(mediaSubpath)) {
    scriptLines.push(`<script type="module" src="${VJS10_HTML_CDN_BASE}/media/${mediaSubpath}.js"></script>`);
  }

  return scriptLines.join('\n');
}
