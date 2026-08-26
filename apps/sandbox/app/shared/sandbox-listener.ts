import { SKINS } from '@app/constants';
import { DEFAULT_SANDBOX_LOCALE, SANDBOX_LOCALE_TAGS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import type { Skin } from '@app/types';
import type { MediaResolution } from '@videojs/media';

import { SOURCES, type SourceId } from './sources';

export const PRELOAD_VALUES = ['none', 'metadata', 'auto'] as const;
export type PreloadValue = (typeof PRELOAD_VALUES)[number];
export const DEFAULT_PRELOAD: PreloadValue = 'metadata';

// Any `{height}p`, not just the rungs `MediaResolution` names.
const RESOLUTION_PATTERN = /^\d+p$/;

export const PREFER_PLAYBACK_VALUES = ['mse', 'native'] as const;
export type PreferPlaybackValue = (typeof PREFER_PLAYBACK_VALUES)[number];

const params = new URLSearchParams(window.location.search);

function readSkin(): Skin {
  const skin = params.get('skin');

  return skin && SKINS.includes(skin as Skin) ? (skin as Skin) : 'default';
}

function readSource(): SourceId {
  const source = params.get('source');

  return source && source in SOURCES ? (source as SourceId) : 'hls-1';
}

function readBoolean(name: string): boolean {
  return params.get(name) === '1';
}

function readPreload(): PreloadValue {
  const value = params.get('preload');

  return PRELOAD_VALUES.includes(value as PreloadValue) ? (value as PreloadValue) : DEFAULT_PRELOAD;
}

function readResolution(name: string): MediaResolution | undefined {
  const value = params.get(name);
  if (!value || !RESOLUTION_PATTERN.test(value) || Number.parseInt(value, 10) <= 0) return undefined;

  return value as MediaResolution;
}

/** Absent unless named, so the source default is what runs otherwise. */
function readOptionalBoolean(name: string): boolean | undefined {
  const value = params.get(name);
  if (value === null) return undefined;

  return value !== '0' && value !== 'false';
}

function readPreferPlayback(): PreferPlaybackValue | undefined {
  const value = params.get('preferPlayback');

  return PREFER_PLAYBACK_VALUES.includes(value as PreferPlaybackValue) ? (value as PreferPlaybackValue) : undefined;
}

let currentSkin = readSkin();
let currentSource = readSource();
let currentAutoplay = readBoolean('autoplay');
let currentMuted = readBoolean('muted');
let currentLoop = readBoolean('loop');
let currentPreload = readPreload();
let currentLocale = readLocale();

const initialMaxAutoResolution = readResolution('maxAutoResolution');
const initialMinAutoResolution = readResolution('minAutoResolution');
const initialCapRenditionToPlayerSize = readOptionalBoolean('capRenditionToPlayerSize');
const initialPreferPlayback = readPreferPlayback();

function applyAccentColor(value: string) {
  if (value) {
    document.documentElement.style.setProperty('--media-accent-color', value);
  } else {
    document.documentElement.style.removeProperty('--media-accent-color');
  }
}

applyAccentColor(params.get('accent')?.trim() ?? '');

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'accent-color-change' || typeof event.data.accentColor !== 'string') return;

  applyAccentColor(event.data.accentColor.trim());
});

function readLocale(): SandboxLocaleTag {
  const value = params.get('locale');

  return SANDBOX_LOCALE_TAGS.includes(value as SandboxLocaleTag) ? (value as SandboxLocaleTag) : DEFAULT_SANDBOX_LOCALE;
}

/**
 * Playback options read once from the query string and folded into the _initial_ `source`, so the engine is built with
 * them instead of having them switched in afterwards. Every key is absent unless named, leaving the default sandbox
 * behavior untouched.
 *
 * - `?maxAutoResolution=720p` caps automatic rendition selection.
 * - `?capRenditionToPlayerSize=0` stops the element's size from capping it.
 * - `?minAutoResolution=270p` lowers the floor on that size cap, whose default is `720p` — low enough here to leave a
 *   small player uncapped.
 * - `?preferPlayback=native` forces the browser's own HLS.
 */
export function getInitialPlaybackOverrides(): {
  maxAutoResolution?: MediaResolution;
  capRenditionToPlayerSize?: boolean;
  minAutoResolution?: MediaResolution;
  preferPlayback?: PreferPlaybackValue;
} {
  return {
    ...(initialMaxAutoResolution && { maxAutoResolution: initialMaxAutoResolution }),
    ...(initialCapRenditionToPlayerSize !== undefined && {
      capRenditionToPlayerSize: initialCapRenditionToPlayerSize,
    }),
    ...(initialMinAutoResolution && { minAutoResolution: initialMinAutoResolution }),
    ...(initialPreferPlayback && { preferPlayback: initialPreferPlayback }),
  };
}

export function getInitialSkin(): Skin {
  return currentSkin;
}

export function onSkinChange(callback: (skin: Skin) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'skin-change' || !SKINS.includes(event.data.skin)) return;

    currentSkin = event.data.skin;
    callback(currentSkin);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialSource(): SourceId {
  return currentSource;
}

export function onSourceChange(callback: (source: SourceId) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'source-change' || !(event.data.source in SOURCES)) return;

    currentSource = event.data.source;
    callback(currentSource);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialAutoplay(): boolean {
  return currentAutoplay;
}

export function onAutoplayChange(callback: (autoplay: boolean) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'autoplay-change' || typeof event.data.autoplay !== 'boolean') return;

    currentAutoplay = event.data.autoplay;
    callback(currentAutoplay);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialMuted(): boolean {
  return currentMuted;
}

export function onMutedChange(callback: (muted: boolean) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'muted-change' || typeof event.data.muted !== 'boolean') return;

    currentMuted = event.data.muted;
    callback(currentMuted);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialLoop(): boolean {
  return currentLoop;
}

export function onLoopChange(callback: (loop: boolean) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'loop-change' || typeof event.data.loop !== 'boolean') return;

    currentLoop = event.data.loop;
    callback(currentLoop);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialPreload(): PreloadValue {
  return currentPreload;
}

export function onPreloadChange(callback: (preload: PreloadValue) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'preload-change' || !PRELOAD_VALUES.includes(event.data.preload)) return;

    currentPreload = event.data.preload;
    callback(currentPreload);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialLocale(): SandboxLocaleTag {
  return currentLocale;
}

export function onLocaleChange(callback: (locale: SandboxLocaleTag) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'locale-change' || !SANDBOX_LOCALE_TAGS.includes(event.data.locale)) return;

    currentLocale = event.data.locale;
    callback(currentLocale);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}
