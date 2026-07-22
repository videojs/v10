import type { TranslationParams } from '../../i18n/params';
import type { Text } from '../../i18n/text';
import { emptyText, okText } from '../../i18n/text/common';
import {
  abortedText,
  decodeText,
  encryptedText,
  networkText,
  sourceText,
  titleText,
  unexpectedText,
} from '../../i18n/text/errors';
import { MediaError } from '../../media/media-error';

export type MediaErrorTranslationKey = Extract<
  keyof TranslationParams,
  'errors.aborted' | 'errors.network' | 'errors.decode' | 'errors.source' | 'errors.encrypted' | 'common.empty'
>;

const MEDIA_ERROR_TRANSLATIONS: Record<number, Text | undefined> = {
  [MediaError.MEDIA_ERR_ABORTED]: abortedText,
  [MediaError.MEDIA_ERR_NETWORK]: networkText,
  [MediaError.MEDIA_ERR_DECODE]: decodeText,
  [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: sourceText,
  [MediaError.MEDIA_ERR_ENCRYPTED]: encryptedText,
  [MediaError.MEDIA_ERR_CUSTOM]: emptyText,
};

const STANDARD_CODE_UA_MESSAGES: Partial<Record<number, readonly string[]>> = {
  [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: ['Failed to open media'],
};

function isStandardMediaErrorCode(code: number): boolean {
  return code >= MediaError.MEDIA_ERR_ABORTED && code <= MediaError.MEDIA_ERR_ENCRYPTED;
}

export function getMediaErrorTranslationKey(code: number): MediaErrorTranslationKey | undefined {
  return MEDIA_ERROR_TRANSLATIONS[code]?.key as MediaErrorTranslationKey | undefined;
}

export function getErrorDialogTitleText(): Text {
  return titleText;
}

export function getErrorDialogDismissText(): Text {
  return okText;
}

export function getErrorDialogUnexpectedText(): Text {
  return unexpectedText;
}

/**
 * Resolves dialog body copy: default phrases for known {@link MediaError} defaults, literal text for
 * custom messages, otherwise the generic fallback key.
 */
export function resolveErrorDialogDescription(
  error: (Pick<MediaError, 'code' | 'message'> & { context?: MediaError['context'] }) | null | undefined,
  cachedMessage?: string | null
): Text | string {
  if (error) {
    const text = MEDIA_ERROR_TRANSLATIONS[error.code];
    const message = error.message?.trim();
    if (message) {
      const defaultForCode = MediaError.defaultMessages[error.code];
      if (text && defaultForCode && message === defaultForCode) {
        return text;
      }
      const uaVariants = STANDARD_CODE_UA_MESSAGES[error.code];
      if (text && isStandardMediaErrorCode(error.code) && !error.context && uaVariants?.includes(message)) {
        return text;
      }
      return message;
    }
    if (text) return text;
  }

  const cached = cachedMessage?.trim();
  if (cached) return cached;

  return unexpectedText;
}
