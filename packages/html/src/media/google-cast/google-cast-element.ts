import type { PropertyDeclarationMap } from '@videojs/element';
import { GoogleCast, type GoogleCastProps } from '@videojs/media/dom/google-cast';

import { MediaComponentElement } from '../media-component-element';

/**
 * Adds Google Cast support to the surrounding player's media.
 *
 * Renders nothing — place it inside the player as a sibling of the media
 * element and it registers a {@link GoogleCast} media component with the
 * active media host.
 *
 * @example
 * ```html
 * <video-player>
 *   <hlsjs-video src="https://example.com/stream.m3u8"></hlsjs-video>
 *   <google-cast receiver="YOUR_APP_ID"></google-cast>
 * </video-player>
 * ```
 */
export class GoogleCastElement extends MediaComponentElement<GoogleCast> {
  static readonly tagName = 'google-cast';

  static override properties = {
    src: { type: String },
    contentType: { type: String, attribute: 'content-type' },
    streamType: { type: String, attribute: 'stream-type' },
    receiver: { type: String },
    // `customData` takes an object, so it's a property-only prop.
  } satisfies PropertyDeclarationMap<Exclude<keyof GoogleCastProps, 'customData'>>;

  protected createComponent(): GoogleCast {
    return new GoogleCast();
  }

  /** Source URL loaded on the Cast receiver. Falls back to the media's `src` / `currentSrc`. */
  get src(): string {
    return this.component.src ?? '';
  }

  set src(value: string | null | undefined) {
    this.component.src = value ?? undefined;
  }

  /** MIME type of the Cast source. When unset, the receiver infers it from the URL. */
  get contentType(): string | undefined {
    return this.component.contentType;
  }

  set contentType(value: string | null | undefined) {
    this.component.contentType = value ?? undefined;
  }

  /** Stream type used on the Cast receiver. Falls back to the media's `streamType`. */
  get streamType(): GoogleCastProps['streamType'] {
    return this.component.streamType;
  }

  set streamType(value: GoogleCastProps['streamType'] | null) {
    this.component.streamType = value ?? undefined;
  }

  /** Cast receiver application ID. Defaults to Google's default media receiver. */
  get receiver(): string | undefined {
    return this.component.receiver;
  }

  set receiver(value: string | null | undefined) {
    this.component.receiver = value ?? undefined;
  }

  /** Custom data sent to the Cast receiver with the load request. */
  get customData(): GoogleCastProps['customData'] {
    return this.component.customData;
  }

  set customData(value: GoogleCastProps['customData']) {
    this.component.customData = value;
  }
}
