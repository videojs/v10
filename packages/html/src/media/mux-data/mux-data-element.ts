import type { PropertyDeclarationMap } from '@videojs/element';
import { MuxData, type MuxDataProps } from '@videojs/media/dom/mux';

import { MediaComponentElement } from '../media-component-element';

/**
 * Adds [Mux Data](https://www.mux.com/data) monitoring to the surrounding
 * player's media.
 *
 * Renders nothing — place it inside the player as a sibling of the media
 * element and it registers a {@link MuxData} media component with the active
 * media host.
 *
 * Mux-hosted playback needs no `env-key`: the view reports the Mux playback ID
 * as its `video_id`, which Mux attributes to the owning environment. Set
 * `env-key` to monitor sources Mux doesn't host.
 *
 * @example
 * ```html
 * <video-player>
 *   <mux-video src="https://stream.mux.com/abc123.m3u8"></mux-video>
 *   <mux-data player-software-name="mux-video"></mux-data>
 * </video-player>
 * ```
 */
export class MuxDataElement extends MediaComponentElement<MuxData> {
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
  } satisfies PropertyDeclarationMap<Exclude<keyof MuxDataProps, 'metadata' | 'MuxDataSdk'>>;

  protected createComponent(): MuxData {
    return new MuxData();
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
  get metadata(): MuxDataProps['metadata'] {
    return this.component.metadata;
  }

  set metadata(value: MuxDataProps['metadata']) {
    this.component.metadata = value;
  }

  /** Mux Data SDK used for monitoring. Set to `undefined` to disable monitoring. */
  get MuxDataSdk(): MuxDataProps['MuxDataSdk'] {
    return this.component.MuxDataSdk;
  }

  set MuxDataSdk(value: MuxDataProps['MuxDataSdk']) {
    this.component.MuxDataSdk = value;
  }
}
