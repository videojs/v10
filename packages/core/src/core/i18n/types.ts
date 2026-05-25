/** Matches strings that include the literal substring `needle` (for example a `{param}` token). */
export type Contains<Needle extends string> = `${string}${Needle}${string}`;

/** Shipped built-in locale tags are expanded in a follow-up PR with locale packs. */
export type BuiltInLocale = 'en';

/** BCP 47 language tag; built-ins are narrowed for autocomplete. */
export type Locale = BuiltInLocale | (string & {});

/** Per-key argument contract: `never` means the translator only accepts the key. */
export type TranslationParams = {
  play: never;
  pause: never;
  replay: never;
  mute: never;
  unmute: never;
  seekForward: { seconds: number | string };
  seekBackward: { seconds: number | string };
  enterFullscreen: never;
  exitFullscreen: never;
  enableCaptions: never;
  disableCaptions: never;
  enterPictureInPicture: never;
  exitPictureInPicture: never;
  playingLive: never;
  seekToLiveEdge: never;
  liveBadge: never;
  startCasting: never;
  stopCasting: never;
  connectingCast: never;
  seek: never;
  volume: never;
  timeCurrent: never;
  timeDuration: never;
  timeRemaining: never;
  timeRemainingPhrase: { duration: string };
  playbackRateAria: { rate: number | string };
  timeSliderValueTextRange: { current: string; duration: string };
  volumeSliderValueTextMuted: { percent: number | string };
  indicatorMuted: never;
  indicatorVolume: never;
  indicatorVolumeWithValue: { value: string };
  indicatorCaptionsOn: never;
  indicatorCaptionsOff: never;
  indicatorPaused: never;
  indicatorPlaying: never;
  indicatorFullscreen: never;
  indicatorExitFullscreen: never;
  indicatorPictureInPicture: never;
  indicatorExitPictureInPicture: never;
  mediaErrorAborted: never;
  mediaErrorNetwork: never;
  mediaErrorDecode: never;
  mediaErrorSrcNotSupported: never;
  mediaErrorEncrypted: never;
  mediaErrorCustom: never;
  errorDialogTitle: never;
  errorDialogDismiss: never;
  mediaErrorFallback: never;
};

/**
 * Either a known translation id from {@link TranslationParams}, or any other string the platform may
 * use as copy (custom overlay key, literal text, etc.).
 */
export type TranslationKeyOrString = keyof TranslationParams | (string & {});

/** Placeholder shape for each key that accepts `t(key, params)`. Omitting a key here is a type error when defining strings. */
type ParametricTranslations = {
  seekForward: Contains<'{seconds}'>;
  seekBackward: Contains<'{seconds}'>;
  playbackRateAria: Contains<'{rate}'>;
  timeSliderValueTextRange: Contains<'{current}'> & Contains<'{duration}'>;
  timeRemainingPhrase: Contains<'{duration}'>;
  volumeSliderValueTextMuted: Contains<'{percent}'>;
  indicatorVolumeWithValue: Contains<'{value}'>;
};

/** Player copy keyed by camelCase tokens; all entries are optional overlay keys. */
export type Translations = {
  [K in keyof TranslationParams]?: TranslationParams[K] extends never
    ? string
    : K extends keyof ParametricTranslations
      ? ParametricTranslations[K]
      : never;
};

export type Translator = <K extends keyof TranslationParams>(
  key: K,
  ...args: TranslationParams[K] extends never ? [] : [params: TranslationParams[K]]
) => string;
