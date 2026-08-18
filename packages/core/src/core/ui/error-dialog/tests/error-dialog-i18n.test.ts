import { MediaError } from '@videojs/media';
import { describe, expect, it } from 'vitest';
import {
  getErrorDialogDismissText,
  getErrorDialogTitleText,
  getMediaErrorTranslationKey,
  resolveErrorDialogDescription,
} from '../error-dialog-i18n';

describe('getMediaErrorTranslationKey', () => {
  it('maps standard MediaError codes to registry keys', () => {
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_NETWORK)).toBe('errors.network');
    expect(getMediaErrorTranslationKey(MediaError.MEDIA_ERR_ABORTED)).toBe('errors.aborted');
  });
});

describe('getErrorDialogTitleText', () => {
  it('returns the error dialog title key', () => {
    expect(getErrorDialogTitleText()).toMatchObject({
      key: 'errors.title',
      text: 'Something went wrong.',
    });
  });
});

describe('getErrorDialogDismissText', () => {
  it('returns the dismiss button key', () => {
    expect(getErrorDialogDismissText()).toMatchObject({
      key: 'common.ok',
      text: 'OK',
    });
  });
});

describe('resolveErrorDialogDescription', () => {
  it('returns a registry key when the message matches the default for the code', () => {
    const error = new MediaError(undefined, MediaError.MEDIA_ERR_NETWORK);
    expect(resolveErrorDialogDescription(error, null)).toMatchObject({
      key: 'errors.network',
      text: 'This media could not be loaded due to a network or server issue.',
    });
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
    expect(resolveErrorDialogDescription(error, null)).toMatchObject({
      key: 'errors.source',
      text: 'This media could not be loaded. It may be unavailable, or your browser may not support its format.',
    });
  });

  it('maps the engine unsupported-playback-feature code to its own copy', () => {
    // SVTA 99001, reported by an engine that has no pipeline for the source.
    // The engine deliberately sends no message, so the code is all there is to
    // go on — and it must not fall through to `errors.unexpected`.
    expect(resolveErrorDialogDescription({ code: 99001, message: '' }, null)).toMatchObject({
      key: 'errors.unplayable',
      text: 'This media is unsupported by the player.',
    });
  });

  it('distinguishes an unplayable source from a browser-unsupported one', () => {
    // Both are "can't play it", but only one is about the browser. Showing
    // `errors.source` here would send a viewer to a different browser that
    // behaves identically.
    const unplayable = resolveErrorDialogDescription({ code: 99001, message: '' }, null);
    const unsupportedSource = resolveErrorDialogDescription(
      { code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, message: '' },
      null
    );

    expect(unplayable).not.toEqual(unsupportedSource);
    expect(unplayable).toMatchObject({ key: 'errors.unplayable' });
  });

  it('falls back to cached message then generic key', () => {
    expect(resolveErrorDialogDescription(null, 'Cached')).toBe('Cached');
    expect(resolveErrorDialogDescription(null, null)).toMatchObject({
      key: 'errors.unexpected',
      text: 'An unexpected error occurred.',
    });
  });
});
