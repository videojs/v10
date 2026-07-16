import { HlsJsMedia } from '../hls-js';
import {
  type MuxMaxResolution,
  type MuxMinResolution,
  type MuxRenditionOrder,
  type MuxTokens,
  toMuxVideoURL,
} from './utils';

export { MuxData, type MuxDataProps } from './mux-data';
export * from './utils';

const MUX_DEFAULT_DOMAIN = 'mux.com';

export interface MuxMediaProps {
  playbackId: string;
  customDomain: string;
  maxResolution?: MuxMaxResolution | undefined;
  minResolution?: MuxMinResolution | undefined;
  renditionOrder?: MuxRenditionOrder | undefined;
  programStartTime?: number | undefined;
  programEndTime?: number | undefined;
  assetStartTime?: number | undefined;
  assetEndTime?: number | undefined;
  playbackToken?: string | undefined;
  tokens?: MuxTokens | undefined;
  extraSourceParams?: Record<string, string | undefined> | undefined;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  playbackId: '',
  customDomain: MUX_DEFAULT_DOMAIN,
  maxResolution: undefined,
  minResolution: undefined,
  renditionOrder: undefined,
  programStartTime: undefined,
  programEndTime: undefined,
  assetStartTime: undefined,
  assetEndTime: undefined,
  playbackToken: undefined,
  tokens: undefined,
  extraSourceParams: undefined,
};

export class MuxMedia extends HlsJsMedia implements MuxMediaProps {
  #playbackId = muxMediaDefaultProps.playbackId;
  #customDomain = muxMediaDefaultProps.customDomain;
  #maxResolution: MuxMaxResolution | undefined;
  #minResolution: MuxMinResolution | undefined;
  #renditionOrder: MuxRenditionOrder | undefined;
  #programStartTime: number | undefined;
  #programEndTime: number | undefined;
  #assetStartTime: number | undefined;
  #assetEndTime: number | undefined;
  #playbackToken: string | undefined;
  #tokens: MuxTokens | undefined;
  #extraSourceParams: Record<string, string | undefined> | undefined;

  /** Mux playback ID. Setting it derives `src` as the Mux HLS stream URL. */
  get playbackId(): string {
    return this.#playbackId;
  }

  set playbackId(value: string) {
    if (this.#playbackId === value) return;
    this.#playbackId = value;
    this.#updateSrc();
  }

  /** Custom domain used to build the stream URL. Defaults to `mux.com`. */
  get customDomain(): string {
    return this.#customDomain;
  }

  set customDomain(value: string) {
    const next = value || MUX_DEFAULT_DOMAIN;
    if (this.#customDomain === next) return;
    this.#customDomain = next;
    this.#updateSrc();
  }

  /** Cap the highest rendition resolution served for playback. */
  get maxResolution(): MuxMaxResolution | undefined {
    return this.#maxResolution;
  }

  set maxResolution(value: MuxMaxResolution | undefined) {
    if (this.#maxResolution === value) return;
    this.#maxResolution = value;
    this.#updateSrc();
  }

  /** Floor the lowest rendition resolution served for playback. */
  get minResolution(): MuxMinResolution | undefined {
    return this.#minResolution;
  }

  set minResolution(value: MuxMinResolution | undefined) {
    if (this.#minResolution === value) return;
    this.#minResolution = value;
    this.#updateSrc();
  }

  /** Order renditions are listed in the manifest (`'asc'` / `'desc'`). */
  get renditionOrder(): MuxRenditionOrder | undefined {
    return this.#renditionOrder;
  }

  set renditionOrder(value: MuxRenditionOrder | undefined) {
    if (this.#renditionOrder === value) return;
    this.#renditionOrder = value;
    this.#updateSrc();
  }

  /** Clip the playback window to start at this program time (epoch seconds). */
  get programStartTime(): number | undefined {
    return this.#programStartTime;
  }

  set programStartTime(value: number | undefined) {
    if (this.#programStartTime === value) return;
    this.#programStartTime = value;
    this.#updateSrc();
  }

  /** Clip the playback window to end at this program time (epoch seconds). */
  get programEndTime(): number | undefined {
    return this.#programEndTime;
  }

  set programEndTime(value: number | undefined) {
    if (this.#programEndTime === value) return;
    this.#programEndTime = value;
    this.#updateSrc();
  }

  /** Clip the playback window to start at this asset time (seconds). */
  get assetStartTime(): number | undefined {
    return this.#assetStartTime;
  }

  set assetStartTime(value: number | undefined) {
    if (this.#assetStartTime === value) return;
    this.#assetStartTime = value;
    this.#updateSrc();
  }

  /** Clip the playback window to end at this asset time (seconds). */
  get assetEndTime(): number | undefined {
    return this.#assetEndTime;
  }

  set assetEndTime(value: number | undefined) {
    if (this.#assetEndTime === value) return;
    this.#assetEndTime = value;
    this.#updateSrc();
  }

  /** Signed-playback token. Shorthand for `tokens.playback`. */
  get playbackToken(): string | undefined {
    return this.#playbackToken;
  }

  set playbackToken(value: string | undefined) {
    if (this.#playbackToken === value) return;
    this.#playbackToken = value;
    this.#updateSrc();
  }

  /** Signed-playback tokens keyed by resource (`playback`, `drm`, etc.). */
  get tokens(): MuxTokens | undefined {
    return this.#tokens;
  }

  set tokens(value: MuxTokens | undefined) {
    if (this.#tokens === value) return;
    this.#tokens = value;
    this.#updateSrc();
  }

  /** Extra query params appended to the stream URL (public playback only). */
  get extraSourceParams(): Record<string, string | undefined> | undefined {
    return this.#extraSourceParams;
  }

  set extraSourceParams(value: Record<string, string | undefined> | undefined) {
    if (this.#extraSourceParams === value) return;
    this.#extraSourceParams = value;
    this.#updateSrc();
  }

  #updateSrc(): void {
    this.src =
      toMuxVideoURL({
        playbackId: this.#playbackId,
        customDomain: this.#customDomain,
        maxResolution: this.#maxResolution,
        minResolution: this.#minResolution,
        renditionOrder: this.#renditionOrder,
        programStartTime: this.#programStartTime,
        programEndTime: this.#programEndTime,
        assetStartTime: this.#assetStartTime,
        assetEndTime: this.#assetEndTime,
        playbackToken: this.#playbackToken,
        tokens: this.#tokens,
        extraSourceParams: this.#extraSourceParams,
      }) ?? '';
  }
}
