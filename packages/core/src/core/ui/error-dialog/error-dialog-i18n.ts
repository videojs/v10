import type { TranslationParams } from '../../i18n/types';
import { MediaError } from '../../media/media-error';

export type MediaErrorTranslationKey = Extract<
  keyof TranslationParams,
  | 'You aborted the media playback'
  | 'A network error caused the media download to fail.'
  | 'A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.'
  | 'An unsupported error occurred. The server or network failed, or your browser does not support this format.'
  | 'The media is encrypted and there are no keys to decrypt it.'
  | ''
>;

const MEDIA_ERROR_CODE_TO_KEY: Record<number, MediaErrorTranslationKey | undefined> = {
  [MediaError.MEDIA_ERR_ABORTED]: 'You aborted the media playback',
  [MediaError.MEDIA_ERR_NETWORK]: 'A network error caused the media download to fail.',
  [MediaError.MEDIA_ERR_DECODE]:
    'A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.',
  [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]:
    'An unsupported error occurred. The server or network failed, or your browser does not support this format.',
  [MediaError.MEDIA_ERR_ENCRYPTED]: 'The media is encrypted and there are no keys to decrypt it.',
  [MediaError.MEDIA_ERR_CUSTOM]: '',
};

const STANDARD_CODE_UA_MESSAGES: Partial<Record<number, readonly string[]>> = {
  [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: ['Failed to open media'],
};

function isStandardMediaErrorCode(code: number): boolean {
  return code >= MediaError.MEDIA_ERR_ABORTED && code <= MediaError.MEDIA_ERR_ENCRYPTED;
}

export function getMediaErrorTranslationKey(code: number): MediaErrorTranslationKey | undefined {
  return MEDIA_ERROR_CODE_TO_KEY[code];
}

export function getErrorDialogTitleLabel(): string {
  return 'Something went wrong.';
}

export function getErrorDialogDismissLabel(): string {
  return 'OK';
}

/**
 * Resolves dialog body copy: default phrases for known {@link MediaError} defaults, literal text for
 * custom messages, otherwise the generic fallback key.
 */
export function resolveErrorDialogDescription(
  error: (Pick<MediaError, 'code' | 'message'> & { context?: MediaError['context'] }) | null | undefined,
  cachedMessage?: string | null
): string {
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

  return 'An error occurred. Please try again.';
}
