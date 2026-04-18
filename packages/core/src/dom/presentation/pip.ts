import { isFunction } from '@videojs/utils/predicate';
import { resolveHTMLMediaElement, resolveHTMLVideoElement } from '../media/predicate';
import type { Media } from '../media/types';
import { isWebKitVideoElement } from './webkit';

export function isPictureInPictureEnabled(media: Media): boolean {
  const video = resolveHTMLVideoElement(media);
  if (!video) return false;

  if (isWebKitVideoElement(video)) {
    return video.webkitSupportsPresentationMode('picture-in-picture');
  }

  if (isFunction(video.requestPictureInPicture)) {
    return true;
  }

  return false;
}

export function isPictureInPictureElement(media: Media): boolean {
  const target = resolveHTMLMediaElement(media);

  if (document.pictureInPictureElement === target) {
    return true;
  }

  if (isWebKitVideoElement(target)) {
    return target.webkitPresentationMode === 'picture-in-picture';
  }

  return false;
}

export function requestPictureInPicture(media: Media): Promise<unknown> {
  const video = resolveHTMLVideoElement(media);

  if (!video) {
    throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
  }

  if (isFunction(video.requestPictureInPicture)) {
    return video.requestPictureInPicture();
  }

  if (isWebKitVideoElement(video)) {
    return Promise.resolve(video.webkitSetPresentationMode('picture-in-picture'));
  }

  throw new DOMException('Picture-in-Picture not supported', 'NotSupportedError');
}

export function exitPictureInPicture(media?: Media): Promise<void> {
  const video = media && resolveHTMLVideoElement(media);

  if (isWebKitVideoElement(video)) {
    return Promise.resolve(video.webkitSetPresentationMode('inline'));
  }

  if (isFunction(document.exitPictureInPicture)) {
    return document.exitPictureInPicture();
  }

  return Promise.resolve();
}
