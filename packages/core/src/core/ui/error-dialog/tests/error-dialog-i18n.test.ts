import { describe, expect, it } from 'vitest';
import { MediaError } from '../../../media/media-error';
import {
  getErrorDialogDismissLabel,
  getErrorDialogTitleLabel,
  getMediaErrorTranslationKey,
  resolveErrorDialogDescription,
} from '../error-dialog-i18n';

describe('getMediaErrorTranslationKey', () => {
  it('maps standard MediaError codes to registry keys', () => {
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_NETWORK)).toBe('mediaErrorNetwork');
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_ABORTED)).toBe('mediaErrorAborted');
  });
});

describe('getErrorDialogTitleLabel', () => {
  it('returns the error dialog title key', () => {
    expect(getErrorDialogTitleLabel()).toBe('errorDialogTitle');
  });
});

describe('getErrorDialogDismissLabel', () => {
  it('returns the dismiss button key', () => {
    expect(getErrorDialogDismissLabel()).toBe('errorDialogDismiss');
  });
});

describe('resolveErrorDialogDescription', () => {
  it('returns a registry key when the message matches the default for the code', () => {
    const error = new MediaError(undefined, MediaError.MEDIA_ERR_NETWORK);
    expect(resolveErrorDialogDescription(error, null)).toBe('mediaErrorNetwork');
  });

  it('returns custom message text when context is provided', () => {
    const error = new MediaError('Custom failure', MediaError.MEDIA_ERR_NETWORK, true, 'hls');
    expect(resolveErrorDialogDescription(error, null)).toBe('Custom failure');
  });

  it('returns custom message text on standard codes without context', () => {
    const error = new MediaError('App network failure', MediaError.MEDIA_ERR_NETWORK);
    expect(resolveErrorDialogDescription(error, null)).toBe('App network failure');
  });

  it('returns a registry key for browser-specific messages on standard codes', () => {
    const error = new MediaError('Failed to open media', MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
    expect(resolveErrorDialogDescription(error, null)).toBe('mediaErrorSrcNotSupported');
  });

  it('falls back to cached message then generic key', () => {
    expect(resolveErrorDialogDescription(null, 'Cached')).toBe('Cached');
    expect(resolveErrorDialogDescription(null, null)).toBe('mediaErrorFallback');
  });
});
