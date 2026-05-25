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

const STANDARD_CODE_UA_MESSAGES: Partial<Record<number, readonly string[]>> = {
  [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: ['Failed to open media'],
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
  error: (Pick<MediaError, 'code' | 'message'> & { context?: MediaError['context'] }) | null | undefined,
  cachedMessage?: string | null
): TranslationKeyOrString {
  if (error) {
    const key = getMediaErrorTranslationKey(error.code);
    const message = error.message?.trim();
    if (message) {
      const defaultForCode = MediaError.defaultMessages[error.code];
      if (key && defaultForCode && message === defaultForCode) {
        return key;
      }
      const uaVariants = STANDARD_CODE_UA_MESSAGES[error.code];
      if (key && isStandardMediaErrorCode(error.code) && !error.context && uaVariants?.includes(message)) {
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
