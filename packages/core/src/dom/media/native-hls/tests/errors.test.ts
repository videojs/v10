import { describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../../core/media/media-error';
import { NativeHlsMediaErrorsMixin, type NativeMediaHost } from '../errors';

class FakeHost extends EventTarget implements NativeMediaHost {
  #target: HTMLMediaElement | null = null;

  get target() {
    return this.#target;
  }

  attach(target: HTMLMediaElement): void {
    if (!target || this.#target === target) return;
    this.#target = target;
  }

  detach(): void {
    if (!this.#target) return;
    this.#target = null;
  }

  destroy(): void {
    this.#target = null;
  }
}

const NativeHlsMediaErrors = NativeHlsMediaErrorsMixin(FakeHost);

function setup() {
  const host = new NativeHlsMediaErrors();
  const video = document.createElement('video');
  host.attach(video);
  return { host, video };
}

function fireNativeError(video: HTMLVideoElement, code: number, message = '') {
  Object.defineProperty(video, 'error', {
    value: { code, message },
    configurable: true,
  });
  video.dispatchEvent(new Event('error'));
}

describe('NativeHlsMediaErrorsMixin', () => {
  it('dispatches an error event with a MediaError for native errors', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'network failure');

    expect(handler).toHaveBeenCalledOnce();

    const event = handler.mock.calls[0]![0] as ErrorEvent;
    expect(event.error).toBeInstanceOf(MediaError);
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_NETWORK);
    expect(event.error.fatal).toBe(true);
    expect(event.error.message).toBe('network failure');
  });

  it('uses default message when native error has no message', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    fireNativeError(video, MediaError.MEDIA_ERR_DECODE);

    const event = handler.mock.calls[0]![0] as ErrorEvent;
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_DECODE);
    expect(event.error.message).toBe(MediaError.defaultMessages[MediaError.MEDIA_ERR_DECODE]);
  });

  it('exposes the error via the error getter', () => {
    const { host, video } = setup();

    expect(host.error).toBeNull();

    fireNativeError(video, MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'unsupported');

    expect(host.error).toBeInstanceOf(MediaError);
    expect(host.error!.code).toBe(MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
  });

  it('stops propagation of the native error event', () => {
    const { video } = setup();

    const nativeHandler = vi.fn();
    video.addEventListener('error', nativeHandler);

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'network failure');

    expect(nativeHandler).not.toHaveBeenCalled();
  });

  it('maps MEDIA_ERR_ABORTED correctly', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    fireNativeError(video, MediaError.MEDIA_ERR_ABORTED);

    const event = handler.mock.calls[0]![0] as ErrorEvent;
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_ABORTED);
  });

  it('ignores error events when target.error is null', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    video.dispatchEvent(new Event('error'));

    expect(handler).not.toHaveBeenCalled();
    expect(host.error).toBeNull();
  });

  it('stops listening after detach', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    host.detach();

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'after detach');

    expect(handler).not.toHaveBeenCalled();
  });

  it('resets error after detach', () => {
    const { host, video } = setup();

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'failure');

    expect(host.error).not.toBeNull();

    host.detach();

    expect(host.error).toBeNull();
  });

  it('stops listening after destroy', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    host.destroy();

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'after destroy');

    expect(handler).not.toHaveBeenCalled();
  });

  it('resets error after destroy', () => {
    const { host, video } = setup();

    fireNativeError(video, MediaError.MEDIA_ERR_DECODE, 'failure');

    expect(host.error).not.toBeNull();

    host.destroy();

    expect(host.error).toBeNull();
  });

  it('clears stale error on source change (emptied event)', () => {
    const { host, video } = setup();

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'failure');
    expect(host.error).not.toBeNull();

    video.dispatchEvent(new Event('emptied'));

    expect(host.error).toBeNull();
  });

  it('has target set when error handler fires during attach', () => {
    const host = new NativeHlsMediaErrors();
    const video = document.createElement('video');

    let targetDuringError: EventTarget | null = 'unset' as any;
    host.addEventListener('error', () => {
      targetDuringError = host.target;
    });

    Object.defineProperty(video, 'error', {
      value: { code: MediaError.MEDIA_ERR_NETWORK, message: 'fail' },
      configurable: true,
    });

    host.attach(video);
    video.dispatchEvent(new Event('error'));

    expect(targetDuringError).toBe(video);
  });

  it('does not register listeners when base attach guard rejects same target', () => {
    const host = new NativeHlsMediaErrors();
    const video = document.createElement('video');
    host.attach(video);

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'first');
    expect(host.error).not.toBeNull();

    video.dispatchEvent(new Event('emptied'));
    expect(host.error).toBeNull();

    host.attach(video);

    const handler = vi.fn();
    host.addEventListener('error', handler);
    fireNativeError(video, MediaError.MEDIA_ERR_DECODE, 'second');

    expect(handler).toHaveBeenCalledOnce();
  });

  it('re-initializes on re-attach', () => {
    const { host } = setup();

    const handler = vi.fn();
    host.addEventListener('error', handler);

    host.detach();

    const video2 = document.createElement('video');
    host.attach(video2);

    fireNativeError(video2, MediaError.MEDIA_ERR_NETWORK, 'new target');

    expect(handler).toHaveBeenCalledOnce();

    const event = handler.mock.calls[0]![0] as ErrorEvent;
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_NETWORK);
  });
});
