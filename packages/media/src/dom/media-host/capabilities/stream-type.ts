import { type MediaStreamType, type MediaStreamTypeCapability, MediaStreamTypes } from '../../../core/types';
import { setMediaProp } from '../../utils';
import type { MediaHostBase } from '../base';
import { defineMediaCapability } from '../capability';

/**
 * Consumer-set stream type, held per host.
 *
 * Detecting hosts report their own value through the target, but a consumer can override detection, and that override
 * has to survive a target that reports nothing.
 */
const overrides = new WeakMap<MediaHostBase, MediaStreamType>();

/**
 * Whether the media is on-demand, live, or not yet known.
 *
 * Reading prefers what the media reports and falls back to the consumer's override. Writing announces
 * `streamtypechange` itself, since no media element dispatches it.
 */
export const streamTypeCapability = defineMediaCapability<MediaStreamTypeCapability>()({
  name: 'stream-type',
  events: ['streamtypechange'],
  attributes: {
    streamType: { type: String, attribute: 'stream-type', empty: 'unknown' },
  },
  props: {
    streamType: {
      fallback: MediaStreamTypes.UNKNOWN,
      get: (host, forwarded) => forwarded ?? overrides.get(host) ?? MediaStreamTypes.UNKNOWN,
      set: (host, value) => {
        if (readStreamType(host) === value) return;

        overrides.set(host, value);
        setMediaProp<MediaStreamTypeCapability>(host, 'streamType', value);
        host.dispatchEvent(new Event('streamtypechange'));
      },
    },
  },
});

function readStreamType(host: MediaHostBase): MediaStreamType {
  return (host as MediaHostBase & Partial<MediaStreamTypeCapability>).streamType ?? MediaStreamTypes.UNKNOWN;
}
