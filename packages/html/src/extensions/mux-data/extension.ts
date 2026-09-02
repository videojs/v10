import type { PropertyDeclarationMap } from '@videojs/element';
import { MuxDataExtension as MuxDataExtensionBase, type MuxDataExtensionProps } from '@videojs/mux-data';

import { MediaExtensionElement } from '../media-extension-element';

/**
 * Adds the [Mux Data](https://www.mux.com/data) extension to the surrounding player's media.
 *
 * Renders nothing — place it inside the player as a sibling of the media element and it follows the active media.
 *
 * Mux-hosted playback needs no `env-key`: the view reports the Mux playback ID as its `video_id`, which Mux attributes
 * to the owning environment. Set `env-key` to monitor sources Mux doesn't host.
 *
 * Any media element works. When the media plays through an hls.js or dash.js engine, that engine is handed to the Mux
 * Data SDK so the view also carries stream-level detail such as rendition switches and request timing.
 *
 * @example
 *   ```html
 *   <video-player>
 *   <mux-video src="https://stream.mux.com/abc123.m3u8"></mux-video>
 *   <mux-data player-software-name="mux-video"></mux-data>
 *   </video-player>
 *   ```;
 */
export class MuxDataExtension extends MediaExtensionElement<MuxDataExtensionBase> {
  static readonly tagName = 'mux-data';

  static override properties = {
    envKey: { type: String, attribute: 'env-key' },
    beaconCollectionDomain: { type: String, attribute: 'beacon-collection-domain' },
    debug: { type: Boolean },
    disableCookies: { type: Boolean, attribute: 'disable-cookies' },
    playerSoftwareName: { type: String, attribute: 'player-software-name' },
    playerSoftwareVersion: { type: String, attribute: 'player-software-version' },
    playerInitTime: { type: Number, attribute: 'player-init-time' },
    // `metadata` and `MuxDataSdk` take objects, so they're property-only props.
  } satisfies PropertyDeclarationMap<Exclude<keyof MuxDataExtensionProps, 'metadata' | 'MuxDataSdk'>>;

  protected createComponent(): MuxDataExtensionBase {
    return new MuxDataExtensionBase();
  }

  /** Mux Data environment key for the beacons. Optional for Mux-hosted playback. */
  get envKey(): string | undefined {
    return this.component.envKey;
  }

  set envKey(value: string | null | undefined) {
    this.component.envKey = value ?? undefined;
  }

  /** Custom domain beacons are sent to. */
  get beaconCollectionDomain(): string | undefined {
    return this.component.beaconCollectionDomain;
  }

  set beaconCollectionDomain(value: string | null | undefined) {
    this.component.beaconCollectionDomain = value ?? undefined;
  }

  /** Enables Mux Data SDK debug logging. */
  get debug(): boolean {
    return this.component.debug;
  }

  set debug(value: boolean) {
    this.component.debug = value;
  }

  /** Disables Mux Data SDK cookies. */
  get disableCookies(): boolean {
    return this.component.disableCookies;
  }

  set disableCookies(value: boolean) {
    this.component.disableCookies = value;
  }

  /** Player software name reported to Mux Data (e.g. `mux-video`). */
  get playerSoftwareName(): string | undefined {
    return this.component.playerSoftwareName;
  }

  set playerSoftwareName(value: string | null | undefined) {
    this.component.playerSoftwareName = value ?? undefined;
  }

  /** Player software version reported to Mux Data. Defaults to the Video.js version. */
  get playerSoftwareVersion(): string | undefined {
    return this.component.playerSoftwareVersion;
  }

  set playerSoftwareVersion(value: string | null | undefined) {
    this.component.playerSoftwareVersion = value ?? undefined;
  }

  /** Epoch milliseconds the player was initialized. Defaults to the component's creation time. */
  get playerInitTime(): number | undefined {
    return this.component.playerInitTime;
  }

  set playerInitTime(value: number | null | undefined) {
    this.component.playerInitTime = value ?? undefined;
  }

  /** Custom view metadata forwarded to the Mux Data SDK. */
  get metadata(): MuxDataExtensionProps['metadata'] {
    return this.component.metadata;
  }

  set metadata(value: MuxDataExtensionProps['metadata']) {
    this.component.metadata = value;
  }

  /** Mux Data SDK used for monitoring. Set to `undefined` to disable monitoring. */
  get MuxDataSdk(): MuxDataExtensionProps['MuxDataSdk'] {
    return this.component.MuxDataSdk;
  }

  set MuxDataSdk(value: MuxDataExtensionProps['MuxDataSdk']) {
    this.component.MuxDataSdk = value;
  }
}
