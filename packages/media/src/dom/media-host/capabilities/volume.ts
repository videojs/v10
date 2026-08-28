import type { MediaVolumeCapability } from '../../../core/types';
import { defineMediaCapability } from '../capability';

/**
 * Volume forwarding.
 *
 * Compose this only into hosts whose media can honor a volume level or a mute. A host that leaves it out has no
 * `volume`, `muted`, or `defaultMuted` at all, so `isMediaVolumeCapable` reports it honestly, the player's volume
 * feature never attaches, and `CustomMediaElement` mirrors neither the properties nor the `muted` attribute onto the
 * element.
 */
export const volumeCapability = defineMediaCapability<MediaVolumeCapability>()({
  name: 'volume',
  events: ['volumechange'],
  attributes: {
    defaultMuted: { type: Boolean, attribute: 'muted' },
  },
  props: {
    volume: { fallback: 1 },
    muted: { fallback: false },
    defaultMuted: { fallback: false },
  },
});
