import { SKINS, STYLINGS } from '@app/constants';
import { DEFAULT_SANDBOX_LOCALE, SANDBOX_LOCALE_TAGS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import type { Skin, Styling } from '@app/types';
import type { MediaResolution } from '@videojs/media';
import { isBoolean, isString } from '@videojs/utils/predicate';

import { DEFAULT_SOURCE, SOURCES, type SourceId } from './sources';

export const PRELOAD_VALUES = ['none', 'metadata', 'auto'] as const;
export type PreloadValue = (typeof PRELOAD_VALUES)[number];
export const DEFAULT_PRELOAD: PreloadValue = 'metadata';

// Any `{height}p`, not just the rungs `MediaResolution` names.
const RESOLUTION_PATTERN = /^\d+p$/;

export const PREFER_PLAYBACK_VALUES = ['mse', 'native'] as const;
export type PreferPlaybackValue = (typeof PREFER_PLAYBACK_VALUES)[number];

const params = new URLSearchParams(window.location.search);

/**
 * The selections a preview page renders from. The shell writes them into the page URL and, once the page has loaded,
 * streams each change as a `<key>-change` message. Styling is the exception: changing it remounts the page.
 */
export interface SandboxState {
  skin: Skin;
  source: SourceId;
  styling: Styling;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  preload: PreloadValue;
}

type StreamedKey = Exclude<keyof SandboxState, 'styling'>;

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  // SAFETY: the tuple is widened to strings only for the lookup; the guard narrows the value back to `T`.
  return isString(value) && (values as readonly string[]).includes(value);
}

function parseSkin(value: unknown): Skin | undefined {
  return isOneOf(SKINS, value) ? value : undefined;
}

function parseStyling(value: unknown): Styling | undefined {
  return isOneOf(STYLINGS, value) ? value : undefined;
}

function parseSource(value: unknown): SourceId | undefined {
  // SAFETY: `in` checked the string against the source map's keys.
  return isString(value) && value in SOURCES ? (value as SourceId) : undefined;
}

function parseFlag(value: unknown): boolean | undefined {
  return isBoolean(value) ? value : undefined;
}

function parsePreload(value: unknown): PreloadValue | undefined {
  return isOneOf(PRELOAD_VALUES, value) ? value : undefined;
}

function parseLocale(value: unknown): SandboxLocaleTag | undefined {
  return isOneOf(SANDBOX_LOCALE_TAGS, value) ? value : undefined;
}

/** A query flag is `1` or absent, where the streamed value is a boolean. */
function readFlag(name: string): boolean {
  return params.get(name) === '1';
}

/** The selections the page URL names, with the shell's defaults for the rest. */
export function readSandboxState(): SandboxState {
  return {
    skin: parseSkin(params.get('skin')) ?? 'default',
    source: parseSource(params.get('source')) ?? DEFAULT_SOURCE,
    styling: parseStyling(params.get('styling')) ?? 'css',
    autoplay: readFlag('autoplay'),
    muted: readFlag('muted'),
    loop: readFlag('loop'),
    preload: parsePreload(params.get('preload')) ?? DEFAULT_PRELOAD,
  };
}

/**
 * Listen for the shell's `<name>-change` messages. The payload field named `name` has to pass `parse`; a message that
 * fails it is dropped, so a malformed post cannot put the page into a state the shell would never send.
 */
function subscribe<T>(
  name: string,
  parse: (value: unknown) => T | undefined,
  callback: (value: T) => void
): () => void {
  const type = `${name}-change`;
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== type) return;

    const value = parse(event.data[name]);
    if (value === undefined) return;

    callback(value);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

const streamedKeys: readonly StreamedKey[] = ['skin', 'source', 'autoplay', 'muted', 'loop', 'preload'];

const streamed: { [K in StreamedKey]: (value: unknown) => SandboxState[K] | undefined } = {
  skin: parseSkin,
  source: parseSource,
  autoplay: parseFlag,
  muted: parseFlag,
  loop: parseFlag,
  preload: parsePreload,
};

function streamKey<K extends StreamedKey>(key: K, callback: (change: Partial<SandboxState>) => void): () => void {
  return subscribe(key, streamed[key], (value) => {
    const change: Partial<SandboxState> = {};

    change[key] = value;
    callback(change);
  });
}

/** Calls back with each selection the shell streams in after load, as a partial state to merge into the last one. */
export function onSandboxStateChange(callback: (change: Partial<SandboxState>) => void): () => void {
  const unsubscribes = streamedKeys.map((key) => streamKey(key, callback));

  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
}

let currentLocale = parseLocale(params.get('locale')) ?? DEFAULT_SANDBOX_LOCALE;

export function getInitialLocale(): SandboxLocaleTag {
  return currentLocale;
}

export function onLocaleChange(callback: (locale: SandboxLocaleTag) => void): () => void {
  return subscribe('locale', parseLocale, (locale) => {
    currentLocale = locale;
    callback(locale);
  });
}

function applyAccentColor(value: string) {
  if (value) {
    document.documentElement.style.setProperty('--media-accent-color', value);
  } else {
    document.documentElement.style.removeProperty('--media-accent-color');
  }
}

applyAccentColor(params.get('accent')?.trim() ?? '');

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'accent-color-change' || !isString(event.data.accentColor)) return;

  applyAccentColor(event.data.accentColor.trim());
});

function readResolution(name: string): MediaResolution | undefined {
  const value = params.get(name);
  if (!value || !RESOLUTION_PATTERN.test(value) || Number.parseInt(value, 10) <= 0) return undefined;

  // SAFETY: the pattern guarantees the `{height}p` shape the resolution type names.
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

  return isOneOf(PREFER_PLAYBACK_VALUES, value) ? value : undefined;
}

const initialMaxAutoResolution = readResolution('maxAutoResolution');
const initialMinAutoResolution = readResolution('minAutoResolution');
const initialCapRenditionToPlayerSize = readOptionalBoolean('capRenditionToPlayerSize');
const initialPreferPlayback = readPreferPlayback();

/** Engine options folded into the initial source, so the engine is built with them instead of reconfigured. */
export interface PlaybackOverrides {
  maxAutoResolution?: MediaResolution | undefined;
  capRenditionToPlayerSize?: boolean | undefined;
  minAutoResolution?: MediaResolution | undefined;
  preferPlayback?: PreferPlaybackValue | undefined;
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
export function getInitialPlaybackOverrides(): PlaybackOverrides {
  return {
    ...(initialMaxAutoResolution && { maxAutoResolution: initialMaxAutoResolution }),
    ...(initialCapRenditionToPlayerSize !== undefined && {
      capRenditionToPlayerSize: initialCapRenditionToPlayerSize,
    }),
    ...(initialMinAutoResolution && { minAutoResolution: initialMinAutoResolution }),
    ...(initialPreferPlayback && { preferPlayback: initialPreferPlayback }),
  };
}
