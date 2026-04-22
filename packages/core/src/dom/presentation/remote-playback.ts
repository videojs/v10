import { isObject } from '@videojs/utils/predicate';

import type { MediaRemotePlaybackCapability } from '../../core/media/types';

function resolveRemote(media: EventTarget): MediaRemotePlaybackCapability['remote'] | undefined {
  const target = media as EventTarget & { remote?: unknown };
  if (isObject(target.remote) && 'state' in target.remote && 'prompt' in target.remote) {
    return target.remote as MediaRemotePlaybackCapability['remote'];
  }
  return undefined;
}

export function isRemotePlaybackConnected(media: EventTarget) {
  return resolveRemote(media)?.state === 'connected';
}

export function isRemotePlaybackConnecting(media: EventTarget) {
  return resolveRemote(media)?.state === 'connecting';
}

export async function requestRemotePlayback(media: EventTarget) {
  const remote = resolveRemote(media);
  if (!remote) {
    throw new DOMException('Remote playback not supported', 'NotSupportedError');
  }
  return remote.prompt();
}
