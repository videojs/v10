import type { Contains, EnsureRecord } from '@videojs/utils/types';
import type { LOCALES } from './locales';

/** BCP 47 language tag; built-ins are narrowed for autocomplete. */
export type Locale = (typeof LOCALES)[number] | (string & {});

/** Per-phrase argument contract: `never` means the translator only accepts the phrase. */
export type TranslationParams = {
  Play: never;
  Pause: never;
  Replay: never;
  Mute: never;
  Unmute: never;
  'Seek forward {seconds} seconds': { seconds: number | string };
  'Seek backward {seconds} seconds': { seconds: number | string };
  'Enter fullscreen': never;
  'Exit fullscreen': never;
  'Enable captions': never;
  'Disable captions': never;
  'Enter picture-in-picture': never;
  'Exit picture-in-picture': never;
  'Playing live': never;
  'Seek to live edge': never;
  Live: never;
  'Start casting': never;
  'Stop casting': never;
  Connecting: never;
  Seek: never;
  Volume: never;
  'Current time': never;
  Duration: never;
  Remaining: never;
  '{duration} remaining': { duration: string };
  '{duration}. Show elapsed time.': { duration: string };
  '{duration}. Show duration.': { duration: string };
  '{duration}. Show remaining time.': { duration: string };
  'Playback rate {rate}': { rate: number | string };
  '{current} of {duration}': { current: string; duration: string };
  '{percent}, muted': { percent: number | string };
  Muted: never;
  'Volume {value}': { value: string };
  'Captions on': never;
  'Captions off': never;
  Paused: never;
  Playing: never;
  Fullscreen: never;
  'Picture in picture': never;
  'Exit picture in picture': never;
  'You aborted the media playback': never;
  'A network error caused the media download to fail.': never;
  'A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.': never;
  'An unsupported error occurred. The server or network failed, or your browser does not support this format.': never;
  'The media is encrypted and there are no keys to decrypt it.': never;
  '': never;
  'Something went wrong.': never;
  OK: never;
  'An error occurred. Please try again.': never;
  Settings: never;
  Quality: never;
  Audio: never;
  Default: never;
  Speed: never;
  Captions: never;
  'Playback rate': never;
  Back: never;
  Off: never;
  Auto: never;
  'Auto ({label})': { label: string };
  Subtitles: never;
};

export type TranslationKey = keyof TranslationParams;

type ParametricKey = {
  [K in keyof TranslationParams]: TranslationParams[K] extends never ? never : K;
}[keyof TranslationParams];

/** Placeholder shape for each phrase that accepts `t(phrase, params)`. */
type ParametricTranslations = EnsureRecord<
  ParametricKey,
  string,
  {
    'Seek forward {seconds} seconds': Contains<'{seconds}'>;
    'Seek backward {seconds} seconds': Contains<'{seconds}'>;
    'Playback rate {rate}': Contains<'{rate}'>;
    '{current} of {duration}': Contains<'{current}'> & Contains<'{duration}'>;
    '{duration} remaining': Contains<'{duration}'>;
    '{duration}. Show elapsed time.': Contains<'{duration}'>;
    '{duration}. Show duration.': Contains<'{duration}'>;
    '{duration}. Show remaining time.': Contains<'{duration}'>;
    '{percent}, muted': Contains<'{percent}'>;
    'Volume {value}': Contains<'{value}'>;
    'Auto ({label})': Contains<'{label}'>;
  }
>;

/** Player copy keyed by the default English UI string; all entries are optional overlays. */
export type Translations = {
  [K in keyof TranslationParams]?: TranslationParams[K] extends never
    ? string
    : K extends keyof ParametricTranslations
      ? ParametricTranslations[K]
      : never;
};

export type Translator = <K extends keyof TranslationParams>(
  phrase: K,
  ...args: TranslationParams[K] extends never ? [] : [params: TranslationParams[K]]
) => string;
