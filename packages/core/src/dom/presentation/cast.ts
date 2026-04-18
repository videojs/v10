import { resolveMediaRemote } from '../media/predicate';
import type { Media } from '../media/types';

export function isCastConnected(media: Media) {
  return resolveMediaRemote(media)?.state === 'connected';
}

export function isCastConnecting(media: Media) {
  return resolveMediaRemote(media)?.state === 'connecting';
}

export async function requestCast(media: Media) {
  const remote = resolveMediaRemote(media);

  if (!remote) {
    throw new DOMException('Remote playback not supported', 'NotSupportedError');
  }

  return remote.prompt();
}
