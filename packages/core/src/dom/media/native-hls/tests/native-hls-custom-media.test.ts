import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../../core/media/media-error';
import { NativeHlsMedia } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('NativeHlsMedia', () => {
  it('dispatches only the enriched ErrorEvent when a native error fires', () => {
    const video = document.createElement('video');
    document.body.appendChild(video);

    const media = new NativeHlsMedia();
    media.attach(video);

    const handler = vi.fn();
    media.addEventListener('error', handler);

    Object.defineProperty(video, 'error', {
      value: { code: MediaError.MEDIA_ERR_NETWORK, message: 'network failure' },
      configurable: true,
    });
    video.dispatchEvent(new Event('error'));

    expect(handler).toHaveBeenCalledOnce();

    const event = handler.mock.calls[0]![0] as ErrorEvent;
    expect(event).toBeInstanceOf(ErrorEvent);
    expect(event.error).toBeInstanceOf(MediaError);
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_NETWORK);
    expect(event.error.message).toBe('network failure');
  });
});
