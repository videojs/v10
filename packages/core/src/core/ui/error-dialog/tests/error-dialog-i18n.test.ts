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
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_NETWORK)).toBe(
      'A network error caused the media download to fail.'
    );
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_ABORTED)).toBe('You aborted the media playback');
  });
});

describe('getErrorDialogTitleLabel', () => {
  it('returns the error dialog title key', () => {
    expect(getErrorDialogTitleLabel()).toBe('Something went wrong.');
  });
});

describe('getErrorDialogDismissLabel', () => {
  it('returns the dismiss button key', () => {
    expect(getErrorDialogDismissLabel()).toBe('OK');
  });
});

describe('resolveErrorDialogDescription', () => {
  it('returns a registry key when the message matches the default for the code', () => {
    const error = new MediaError(undefined, MediaError.MEDIA_ERR_NETWORK);
    expect(resolveErrorDialogDescription(error, null)).toBe('A network error caused the media download to fail.');
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
    expect(resolveErrorDialogDescription(error, null)).toBe(
      'An unsupported error occurred. The server or network failed, or your browser does not support this format.'
    );
  });

  it('falls back to cached message then generic key', () => {
    expect(resolveErrorDialogDescription(null, 'Cached')).toBe('Cached');
    expect(resolveErrorDialogDescription(null, null)).toBe('An error occurred. Please try again.');
  });
});
