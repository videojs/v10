import {
  SOURCE_IDS,
  SOURCES,
  getPosterSrc,
  getStoryboardSrc,
  type SandboxSource,
} from '../../../apps/sandbox/app/shared/sources';

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
export type SkinName =
  | 'default-video'
  | 'minimal-video'
  | 'default-live-video'
  | 'minimal-live-video'
  | 'default-live-audio'
  | 'minimal-live-audio'
  | 'default-audio'
  | 'minimal-audio';
export type StyleMode = 'css' | 'tailwind';

export type Direction = 'ltr' | 'rtl';

export interface PreviewOptions {
  readonly captionsMode: CaptionsMode;
  readonly colorScheme: ColorScheme;
  /** Render the CSS and Tailwind variants of the same skin together. */
  readonly compare: boolean;
  readonly direction: Direction;
  readonly framework: Framework;
  readonly isAudio: boolean;
  readonly isLive: boolean;
  readonly media: SandboxSource;
  readonly mediaId: MediaId;
  readonly playerWidth: number;
  readonly poster: string | undefined;
  readonly skin: SkinName;
  readonly sourceId: Exclude<MediaId, 'error'> | null;
  readonly storyboard: string | undefined;
  readonly styleMode: StyleMode;
}

export function readPreviewOptions(search = location.search): PreviewOptions {
  const params = new URLSearchParams(search);
  const framework = params.get('framework') === 'html' ? 'html' : 'react';
  const requestedSkin = params.get('skin');
  const skin: SkinName = isSkinName(requestedSkin) ? requestedSkin : 'default-video';
  const isAudio = skin.endsWith('-audio');
  const isLive = skin.includes('-live-');
  const styleMode = params.get('style') === 'tailwind' ? 'tailwind' : 'css';
  const captionsMode = params.get('captions') === 'multiple' ? 'multiple' : 'single';
  const colorScheme = params.get('scheme') === 'light' ? 'light' : 'dark';
  const compare = params.get('compare') === 'styles';
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
    sourceId,
    storyboard: sourceId ? getStoryboardSrc(sourceId) : undefined,
    styleMode,
  };
}

function isMediaId(value: string | null): value is MediaId {
  return value === 'error' || (value !== null && Object.hasOwn(SOURCES, value));
}

function isSkinName(value: string | null): value is SkinName {
  return (
    value === 'default-video' ||
    value === 'minimal-video' ||
    value === 'default-live-video' ||
    value === 'minimal-live-video' ||
    value === 'default-live-audio' ||
    value === 'minimal-live-audio' ||
    value === 'default-audio' ||
    value === 'minimal-audio'
  );
}
