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
      'This media could not be loaded due to a network or server issue.'
    );
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_ABORTED)).toBe(
      'You stopped media playback before it finished.'
    );
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
    expect(resolveErrorDialogDescription(error, null)).toBe(
      'This media could not be loaded due to a network or server issue.'
    );
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
      'This media could not be loaded. It may be unavailable, or your browser may not support its format.'
    );
  });

  it('falls back to cached message then generic key', () => {
    expect(resolveErrorDialogDescription(null, 'Cached')).toBe('Cached');
    expect(resolveErrorDialogDescription(null, null)).toBe('An unexpected error occurred.');
  });
});
