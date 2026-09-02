import {
  SOURCE_IDS,
  SOURCES,
  getPosterSrc,
  getStoryboardSrc,
  type SandboxSource,
} from '../../../apps/sandbox/app/shared/sources';
import { isSkinName, type SkinName } from '../src/meta';

export const previewWidth = {
  default: 960,
  max: 960,
  min: 240,
  presets: [
    { label: '24rem', value: 384 },
    { label: '32rem', value: 512 },
    { label: '42rem', value: 672 },
    { label: '60rem', value: 960 },
  ],
} as const;

export const errorSource = {
  label: 'Unsupported source (error dialog)',
  url: '/missing-video-that-does-not-exist.mp4',
  type: 'mp4',
} satisfies SandboxSource;

export const mediaIds = [...SOURCE_IDS, 'error'] as const;

export type CaptionsMode = 'multiple' | 'single';
export type ColorScheme = 'dark' | 'light';
export type Framework = 'html' | 'react';
export type MediaId = (typeof mediaIds)[number];
export type { SkinName };

export type StyleMode = 'css' | 'tailwind';

export type Direction = 'ltr' | 'rtl';

/** Two variants of one skin rendered together: CSS beside Tailwind, or the authored skin beside its packaged output. */
export type CompareMode = 'off' | 'styles' | 'source';

/** Whether a skin comes from the authored source transform or from the generated framework package. */
export type SkinSource = 'authored' | 'generated';

export interface PreviewOptions {
  readonly captionsMode: CaptionsMode;
  readonly colorScheme: ColorScheme;
  readonly compare: CompareMode;
  readonly direction: Direction;
  readonly framework: Framework;
  readonly isAudio: boolean;
  readonly isLive: boolean;
  readonly media: SandboxSource;
  readonly mediaId: MediaId;
  readonly playerWidth: number;
  readonly poster: string | undefined;
  readonly skin: SkinName;
  readonly source: SkinSource;
  readonly sourceId: Exclude<MediaId, 'error'> | null;
  readonly storyboard: string | undefined;
  readonly styleMode: StyleMode;
}

export function readPreviewOptions(search = location.search): PreviewOptions {
  const params = new URLSearchParams(search);
  const framework = params.get('framework') === 'html' ? 'html' : 'react';
  const requestedSkin = params.get('skin');
  const skin: SkinName = requestedSkin && isSkinName(requestedSkin) ? requestedSkin : 'default-video';
  const isAudio = skin.endsWith('-audio');
  const isLive = skin.includes('-live-');
  const compare = readCompareMode(params.get('compare'));
  // Packaged skins ship the CSS styling only, so the source comparison pins the style mode.
  const styleMode = compare !== 'source' && params.get('style') === 'tailwind' ? 'tailwind' : 'css';
  const captionsMode = params.get('captions') === 'multiple' ? 'multiple' : 'single';
  const colorScheme = params.get('scheme') === 'light' ? 'light' : 'dark';
  const direction = params.get('dir') === 'rtl' ? 'rtl' : 'ltr';
  const requestedMedia = params.get('media');
  const mediaId = isMediaId(requestedMedia) ? requestedMedia : isLive ? 'hls-live' : 'mp4-1';
  const requestedWidth = Number.parseInt(params.get('width') ?? '', 10);
  const playerWidth = Number.isFinite(requestedWidth)
    ? Math.min(previewWidth.max, Math.max(previewWidth.min, requestedWidth))
    : previewWidth.default;
  const sourceId = mediaId === 'error' ? null : mediaId;
  const media = sourceId ? SOURCES[sourceId] : errorSource;

  return {
    captionsMode,
    colorScheme,
    compare,
    direction,
    framework,
    isAudio,
    isLive,
    media,
    mediaId,
    playerWidth,
    poster: sourceId ? getPosterSrc(sourceId) : undefined,
    skin,
    source: 'authored',
    sourceId,
    storyboard: sourceId ? getStoryboardSrc(sourceId) : undefined,
    styleMode,
  };
}

function readCompareMode(value: string | null): CompareMode {
  return value === 'styles' || value === 'source' ? value : 'off';
}

function isMediaId(value: string | null): value is MediaId {
  return value === 'error' || (value !== null && Object.hasOwn(SOURCES, value));
}
