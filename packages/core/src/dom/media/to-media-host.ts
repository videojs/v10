import type { Audio, Media, Video } from '../../core/media/types';
import { HTMLAudioElementHost } from './audio-host';
import { HTMLVideoElementHost } from './video-host';

export interface ToMediaHostResult<M> {
  /**
   * The resolved media value. If the input was a raw `<video>` / `<audio>`
   * element, this is a host wrapping it; otherwise it's the input unchanged.
   */
  media: M;
  /**
   * Detach any host created by `toMediaHost`. No-op when the input was
   * already a host (or any non-element value).
   */
  release(): void;
}

/**
 * Wrap a raw `<video>` / `<audio>` element in its corresponding media host
 * so it exposes the full {@link Video} / {@link Audio} API expected by the
 * player features (e.g. `isFullscreen`, `exitPictureInPicture`).
 *
 * If the input is already a host or any non-element value, it is returned
 * unchanged. The caller owns the lifecycle of any host created here — call
 * `release()` to detach it.
 *
 * @label Video
 * @param media - A native `HTMLVideoElement` to wrap.
 */
export function toMediaHost(media: HTMLVideoElement): ToMediaHostResult<Video>;
/**
 * @label Audio
 * @param media - A native `HTMLAudioElement` to wrap.
 */
export function toMediaHost(media: HTMLAudioElement): ToMediaHostResult<Audio>;
/**
 * @label Media
 * @param media - A {@link Media}-shaped value (e.g. an existing host); returned unchanged.
 */
export function toMediaHost(media: Media): ToMediaHostResult<Video>;
/**
 * @label Generic
 * @param media - A media value that is already a host or any non-element value.
 */
export function toMediaHost<M>(media: M): ToMediaHostResult<M>;
export function toMediaHost(media: unknown): ToMediaHostResult<unknown> {
  if (media instanceof HTMLVideoElement) {
    const host = new HTMLVideoElementHost();
    host.attach(media);
    return { media: host, release: () => host.detach() };
  }

  if (media instanceof HTMLAudioElement) {
    const host = new HTMLAudioElementHost();
    host.attach(media);
    return { media: host, release: () => host.detach() };
  }

  return { media, release: noop };
}

function noop(): void {}
