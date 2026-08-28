import type { EventListenerFor, EventType } from '@videojs/utils/dom';

import type { EventLike, MediaFull } from '../../core/types';
import type { HTMLMediaTargetLike } from './base';
import {
  autoplayCapability,
  bufferCapability,
  contentDataCapability,
  controlsCapability,
  errorCapability,
  liveCapability,
  pauseCapability,
  playbackCapability,
  playbackRateCapability,
  playedCapability,
  remotePlaybackCapability,
  seekCapability,
  sourceCapability,
  streamTypeCapability,
  textTrackCapability,
  titleCapability,
  volumeCapability,
} from './capabilities';
import { createMediaHost } from './capability';

export { addMediaComponent, getMediaComponents, getMediaOwner, getMediaProp, setMediaProp } from '../utils';
export {
  type HTMLMediaTargetLike,
  type MediaComponent,
  type MediaComponentConstructor,
  type MediaComponents,
  MediaHostBase,
} from './base';
export * from './capabilities';
export {
  type ComposedMediaApi,
  createMediaHost,
  defineMediaCapability,
  getMediaCapabilities,
  getMediaCapabilityAttributes,
  getMediaCapabilityEvents,
  type MediaCapabilityAttribute,
  type MediaCapabilityDescriptor,
  type MediaCapabilityMethod,
  type MediaCapabilityProp,
  type MediaCapabilitySource,
  type MediaHostConstructor,
  supportsMediaCapability,
} from './capability';

/**
 * Every capability an `HTMLMediaElement` offers.
 *
 * A media with a narrower surface composes its own list rather than inheriting this one, so it exposes no member — and
 * reflects no attribute — for a capability it cannot honor.
 */
export const htmlMediaElementCapabilities = [
  playbackCapability,
  pauseCapability,
  seekCapability,
  sourceCapability,
  volumeCapability,
  playbackRateCapability,
  bufferCapability,
  playedCapability,
  errorCapability,
  textTrackCapability,
  streamTypeCapability,
  liveCapability,
  contentDataCapability,
  remotePlaybackCapability,
  controlsCapability,
  autoplayCapability,
  titleCapability,
] as const;

const HTMLMediaElementHostBase = createMediaHost(htmlMediaElementCapabilities);

/**
 * A host forwarding the full `HTMLMediaElement` surface.
 *
 * The members come from {@link htmlMediaElementCapabilities}; the class body only narrows the base host's target and
 * event types to the ones this host was parameterized with, which is something a composed class cannot express.
 */
export class HTMLMediaElementHost<Target extends HTMLMediaTargetLike, Events extends { [K in keyof Events]: EventLike }>
  extends HTMLMediaElementHostBase
  implements MediaFull
{
  protected override get target(): Target | null {
    return super.target as Target | null;
  }

  override attach(target: Target): void {
    super.attach(target);
  }

  override addEventListener<K extends EventType<Events>>(
    type: K,
    listener: EventListenerFor<Events, K>,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListener, options);
  }

  override removeEventListener<K extends EventType<Events>>(
    type: K,
    listener: EventListenerFor<Events, K>,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListener, options);
  }
}
