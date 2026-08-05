import {
  getMediaSubpath,
  getPresetGroup,
  isAudioUseCase,
  type Renderer,
  type Skin,
  type UseCase,
} from '@/utils/installation/types';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

// Skin-variant bundles published under `@videojs/html/cdn`, a subset of the
// `presets` list in `packages/html/tsdown.cdn.config.ts`. Every preset the
// install page offers ships all three variants; the set stays explicit so a
// preset added to the picker without a matching CDN entry falls back to a
// package manager instead of emitting a script tag that 404s. The
// `CDN preset bundles` check in `build/scripts/check-workspace.mjs` fails CI if
// this drifts from what the CDN config publishes.
//
// `background` is absent because it ships a single bundle for every skin, so
// `getCdnFileName` resolves it before consulting this set.
const CDN_PRESET_BUNDLES = new Set([
  'video',
  'video-headless',
  'video-minimal',
  'audio',
  'audio-headless',
  'audio-minimal',
  'live-video',
  'live-video-headless',
  'live-video-minimal',
  'live-audio',
  'live-audio-headless',
  'live-audio-minimal',
]);

// Bundle name for a preset + skin, or null when that combination has no CDN
// build. `background` ignores skin (it ships one bundle); every other group
// suffixes the skin variant.
function getCdnFileName(useCase: UseCase, skin: Skin): string | null {
  if (useCase === 'background-video') return 'background';

  const group = getPresetGroup(useCase);
  const isMinimal = skin === 'minimal-video' || skin === 'minimal-audio';
  const name = skin === 'none' ? `${group}-headless` : isMinimal ? `${group}-minimal` : group;

  return CDN_PRESET_BUNDLES.has(name) ? name : null;
}

/** Whether a preset + skin combination ships a CDN bundle. */
export function presetSupportsCdn(useCase: UseCase, skin: Skin): boolean {
  return getCdnFileName(useCase, skin) !== null;
}

// Whether a renderer can be installed via CDN, given the set of media subpaths
// that ship a CDN build (from the cdn-media manifest). Preset renderers always
// can (no separate media script); media renderers can only if their subpath is
// in the manifest.
export function rendererSupportsCdn(renderer: Renderer, cdnMediaSubpaths: readonly string[]): boolean {
  const subpath = getMediaSubpath(renderer);
  return subpath === null || cdnMediaSubpaths.includes(subpath);
}

/**
 * Why a configuration can't be installed from the CDN, or null when it can.
 * Callers use the reason to explain the missing CDN option rather than just
 * hiding it.
 */
export type CdnUnsupportedReason = 'preset' | 'renderer';

export function getCdnUnsupportedReason(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  cdnMediaSubpaths: readonly string[]
): CdnUnsupportedReason | null {
  if (!presetSupportsCdn(useCase, skin)) return 'preset';
  if (!rendererSupportsCdn(renderer, cdnMediaSubpaths)) return 'renderer';
  return null;
}

/**
 * CDN script tags for a configuration, or null when it has no CDN build. Gate
 * calls with {@link getCdnUnsupportedReason} to render an explanation instead.
 */
export function generateCdnCode(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  cdnMediaSubpaths: readonly string[]
): string | null {
  const name = getCdnFileName(useCase, skin);
  if (name === null) return null;

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

/** Human-readable label for a preset + skin, used in CDN-unavailable copy. */
export function getPresetLabel(useCase: UseCase, skin: Skin): string {
  if (useCase === 'background-video') return 'background video';

  const base = isAudioUseCase(useCase) ? 'audio' : 'video';
  const live = useCase === 'live-video' || useCase === 'live-audio' ? 'live ' : '';
  if (skin === 'none') return `headless ${live}${base}`;
  if (skin === 'minimal-video' || skin === 'minimal-audio') return `minimal ${live}${base}`;
  return `${live}${base}`;
}
