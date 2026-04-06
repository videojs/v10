import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../../core/media/media-error';
import { NativeHlsCustomMedia } from '../index';

let counter = 0;

function defineElement(): string {
  const tag = `test-nhls-cm-${counter++}`;
  customElements.define(tag, class extends (NativeHlsCustomMedia as unknown as typeof HTMLElement) {});
  return tag;
}

function fireNativeError(video: HTMLVideoElement, code: number, message = '') {
  Object.defineProperty(video, 'error', {
    value: { code, message },
    configurable: true,
  });
  video.dispatchEvent(new Event('error'));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('NativeHlsCustomMedia', () => {
  it('dispatches only the enriched ErrorEvent when a native error fires', () => {
    const tag = defineElement();
    const el = document.createElement(tag);
    document.body.appendChild(el);

    const video = el.shadowRoot!.querySelector('video')! as HTMLVideoElement;
    (el as any).attach(video);

    const handler = vi.fn();
    el.addEventListener('error', handler);

    fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'network failure');

    expect(handler).toHaveBeenCalledOnce();

    const event = handler.mock.calls[0]![0] as ErrorEvent;
    expect(event).toBeInstanceOf(ErrorEvent);
    expect(event.error).toBeInstanceOf(MediaError);
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_NETWORK);
    expect(event.error.message).toBe('network failure');
  });
});
