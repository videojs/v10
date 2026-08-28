import { EMPTY_REMOTE } from '../../../core/constants';
import type { MediaRemotePlaybackCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/**
 * Handing playback to a remote device.
 *
 * The connection events belong to the `remote` object rather than the media, so this capability declares none of its
 * own.
 */
export const remotePlaybackCapability = defineMediaCapability<MediaRemotePlaybackCapability>()({
  name: 'remote-playback',
  events: [],
  attributes: {
    disableRemotePlayback: { type: Boolean },
  },
  props: {
    remote: { fallback: EMPTY_REMOTE, readonly: true },
    disableRemotePlayback: { fallback: false },
  },
});
