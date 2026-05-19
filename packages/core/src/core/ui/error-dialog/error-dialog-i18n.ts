import type { TranslationKeyOrString, TranslationParams } from '../../i18n/types';
import { MediaError } from '../../media/media-error';

export type MediaErrorTranslationKey = Extract<
  keyof TranslationParams,
  | 'mediaErrorAborted'
  | 'mediaErrorNetwork'
  | 'mediaErrorDecode'
  | 'mediaErrorSrcNotSupported'
  | 'mediaErrorEncrypted'
  | 'mediaErrorCustom'
>;

const MEDIA_ERROR_CODE_TO_KEY: Record<number, MediaErrorTranslationKey | undefined> = {
  [MediaError.MEDIA_ERR_ABORTED]: 'mediaErrorAborted',
  [MediaError.MEDIA_ERR_NETWORK]: 'mediaErrorNetwork',
  [MediaError.MEDIA_ERR_DECODE]: 'mediaErrorDecode',
  [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'mediaErrorSrcNotSupported',
  [MediaError.MEDIA_ERR_ENCRYPTED]: 'mediaErrorEncrypted',
  [MediaError.MEDIA_ERR_CUSTOM]: 'mediaErrorCustom',
};

function isStandardMediaErrorCode(code: number): boolean {
  return (
    code === MediaError.MEDIA_ERR_ABORTED ||
    code === MediaError.MEDIA_ERR_NETWORK ||
    code === MediaError.MEDIA_ERR_DECODE ||
    code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
    code === MediaError.MEDIA_ERR_ENCRYPTED
  );
}

export function getMediaErrorTranslationKey(code: number): MediaErrorTranslationKey | undefined {
  return MEDIA_ERROR_CODE_TO_KEY[code];
}

export function getErrorDialogTitleLabel(): TranslationKeyOrString {
  return 'errorDialogTitle';
}

export function getErrorDialogDismissLabel(): TranslationKeyOrString {
  return 'errorDialogDismiss';
}

/**
 * Resolves dialog body copy: registry keys for known {@link MediaError} defaults, literal text for
 * custom messages, otherwise the generic fallback key.
 */
export function resolveErrorDialogDescription(
  error: Pick<MediaError, 'code' | 'message' | 'context'> | null | undefined,
  cachedMessage: string | null | undefined
): TranslationKeyOrString {
  if (error) {
    const key = getMediaErrorTranslationKey(error.code);
    const message = error.message?.trim();
    if (message) {
      const defaultForCode = MediaError.defaultMessages[error.code];
      if (key && defaultForCode && message === defaultForCode) {
        return key;
      }
      // `<video>` and other hosts expose UA-specific strings (for example Firefox's
      // "Failed to open media"). Prefer registry keys for standard HTMLMediaElement codes
      // unless a source attached context (HLS, app code) with its own copy.
      if (key && isStandardMediaErrorCode(error.code) && !error.context) {
        return key;
      }
      return message;
    }
    if (key) return key;
  }

  const cached = cachedMessage?.trim();
  if (cached) return cached;

  return 'mediaErrorFallback';
}
