import { shallowEqual } from '@videojs/utils/object';
import { DelegateMixin } from '../../../core/media/delegate';
import type { InferDelegateProps } from '../../../core/media/types';
import { CustomAudioElement, CustomVideoElement } from '../custom-media-element';
import { HlsMediaDelegate } from '../hls';
import { AudioProxy, VideoProxy } from '../proxy';
import { MuxDataMediaMixin } from './mux-data';
import type { MaxResolutionValue, MinResolutionValue, RenditionOrderValue, Tokens } from './types';

const MUX_VIDEO_DOMAIN = 'mux.com';

export class MuxMediaDelegate extends MuxDataMediaMixin(HlsMediaDelegate) {
  static PLAYER_SOFTWARE_NAME = '';

  #playbackId: string | null = null;
  #customDomain: string = MUX_VIDEO_DOMAIN;
  #maxResolution: MaxResolutionValue | undefined;
  #minResolution: MinResolutionValue | undefined;
  #renditionOrder: RenditionOrderValue | undefined;
  #programStartTime: number | undefined;
  #programEndTime: number | undefined;
  #assetStartTime: number | undefined;
  #assetEndTime: number | undefined;
  #playbackToken: string | undefined;
  #tokens: Tokens | undefined;
  #extraSourceParams: Record<string, any> | undefined;

  get playbackId() {
    return this.#playbackId;
  }

  set playbackId(value: string | null) {
    if (this.#playbackId === value) return;
    this.#playbackId = value;
    this.#syncSrc();
  }

  get customDomain(): string {
    return this.#customDomain;
  }

  set customDomain(value: string) {
    const normalized = value || MUX_VIDEO_DOMAIN;
    if (this.#customDomain === normalized) return;
    this.#customDomain = normalized;
    this.#syncSrc();
  }

  get maxResolution(): MaxResolutionValue | undefined {
    return this.#maxResolution;
  }

  set maxResolution(value: MaxResolutionValue | undefined) {
    if (this.#maxResolution === value) return;
    this.#maxResolution = value;
    this.#syncSrc();
  }

  get minResolution(): MinResolutionValue | undefined {
    return this.#minResolution;
  }

  set minResolution(value: MinResolutionValue | undefined) {
    if (this.#minResolution === value) return;
    this.#minResolution = value;
    this.#syncSrc();
  }

  get renditionOrder(): RenditionOrderValue | undefined {
    return this.#renditionOrder;
  }

  set renditionOrder(value: RenditionOrderValue | undefined) {
    if (this.#renditionOrder === value) return;
    this.#renditionOrder = value;
    this.#syncSrc();
  }

  get programStartTime(): number | undefined {
    return this.#programStartTime;
  }

  set programStartTime(value: number | undefined) {
    if (this.#programStartTime === value) return;
    this.#programStartTime = value;
    this.#syncSrc();
  }

  get programEndTime(): number | undefined {
    return this.#programEndTime;
  }

  set programEndTime(value: number | undefined) {
    if (this.#programEndTime === value) return;
    this.#programEndTime = value;
    this.#syncSrc();
  }

  get assetStartTime(): number | undefined {
    return this.#assetStartTime;
  }

  set assetStartTime(value: number | undefined) {
    if (this.#assetStartTime === value) return;
    this.#assetStartTime = value;
    this.#syncSrc();
  }

  get assetEndTime(): number | undefined {
    return this.#assetEndTime;
  }

  set assetEndTime(value: number | undefined) {
    if (this.#assetEndTime === value) return;
    this.#assetEndTime = value;
    this.#syncSrc();
  }

  get playbackToken(): string | undefined {
    return this.#playbackToken;
  }

  set playbackToken(value: string | undefined) {
    if (this.#playbackToken === value) return;
    this.#playbackToken = value;
    this.#syncSrc();
  }

  get tokens(): Tokens | undefined {
    return this.#tokens;
  }

  set tokens(value: Tokens | undefined) {
    if (this.#tokens !== undefined && value !== undefined && shallowEqual(this.#tokens, value)) {
      return;
    }
    this.#tokens = value;
    this.#syncSrc();
  }

  get extraSourceParams(): Record<string, any> | undefined {
    return this.#extraSourceParams;
  }

  set extraSourceParams(value: Record<string, any> | undefined) {
    if (this.#extraSourceParams === value) return;
    if (this.#extraSourceParams !== undefined && value !== undefined && shallowEqual(this.#extraSourceParams, value)) {
      return;
    }
    this.#extraSourceParams = value;
    this.#syncSrc();
  }

  #syncSrc(): void {
    this.src = this.playbackId ? (toMuxVideoURL(this) ?? '') : '';
  }
}

export const toMuxVideoURL = ({
  playbackId: playbackIdWithParams,
  customDomain: domain = MUX_VIDEO_DOMAIN,
  maxResolution,
  minResolution,
  renditionOrder,
  programStartTime,
  programEndTime,
  assetStartTime,
  assetEndTime,
  // Normalizes different ways of providing playback token
  playbackToken,
  tokens: { playback: token = playbackToken } = {},
  extraSourceParams = {},
}: InferDelegateProps<typeof MuxMediaDelegate> = {}) => {
  if (!playbackIdWithParams) return undefined;
  // Normalizes different ways of providing playback id
  const [playbackId, queryPart = ''] = toPlaybackIdParts(playbackIdWithParams);
  const url = new URL(`https://stream.${domain}/${playbackId}.m3u8${queryPart}`);
  /*
   * All identified query params here can only be added to public
   * playback IDs. In order to use these features with signed URLs
   * the query param must be added to the signing token.
   *
   * */
  if (token || url.searchParams.has('token')) {
    url.searchParams.forEach((_, key) => {
      if (key !== 'token') url.searchParams.delete(key);
    });
    if (token) url.searchParams.set('token', token);
  } else {
    if (maxResolution) {
      url.searchParams.set('max_resolution', maxResolution);
    }
    if (minResolution) {
      url.searchParams.set('min_resolution', minResolution);
      if (maxResolution && +maxResolution.slice(0, -1) < +minResolution.slice(0, -1)) {
        console.error(
          'minResolution must be <= maxResolution',
          'minResolution',
          minResolution,
          'maxResolution',
          maxResolution
        );
      }
    }
    if (renditionOrder) {
      url.searchParams.set('rendition_order', renditionOrder);
    }
    if (programStartTime) {
      url.searchParams.set('program_start_time', `${programStartTime}`);
    }
    if (programEndTime) {
      url.searchParams.set('program_end_time', `${programEndTime}`);
    }
    if (assetStartTime) {
      url.searchParams.set('asset_start_time', `${assetStartTime}`);
    }
    if (assetEndTime) {
      url.searchParams.set('asset_end_time', `${assetEndTime}`);
    }
    Object.entries(extraSourceParams).forEach(([k, v]) => {
      if (v == null) return;
      url.searchParams.set(k, `${v}`);
    });
  }
  return url.toString();
};

export const toPlaybackIdParts = (playbackIdWithOptionalParams: string): [string, string?] => {
  const qIndex = playbackIdWithOptionalParams.indexOf('?');
  if (qIndex < 0) return [playbackIdWithOptionalParams];
  const idPart = playbackIdWithOptionalParams.slice(0, qIndex);
  const queryPart = playbackIdWithOptionalParams.slice(qIndex);
  return [idPart, queryPart];
};

export class MuxVideoDelegate extends MuxMediaDelegate {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudioDelegate extends MuxMediaDelegate {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}

export class MuxCustomMedia extends DelegateMixin(CustomVideoElement, MuxMediaDelegate) {}

export class MuxMedia extends DelegateMixin(VideoProxy, MuxMediaDelegate) {}

export class MuxCustomVideo extends DelegateMixin(CustomVideoElement, MuxVideoDelegate) {}

export class MuxVideo extends DelegateMixin(VideoProxy, MuxVideoDelegate) {}

export class MuxCustomAudio extends DelegateMixin(CustomAudioElement, MuxAudioDelegate) {}

export class MuxAudio extends DelegateMixin(AudioProxy, MuxAudioDelegate) {}
