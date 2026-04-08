import type { AnyConstructor, Constructor, MixinReturn } from '@videojs/utils/types';
import Mux from 'mux-embed';

import { CustomAudioElement, CustomVideoElement } from '../custom-media-element';
import { Hls, HlsMediaMixin, type HlsMediaProps } from '../hls';
import { AudioProxy, VideoProxy } from '../proxy';
import { getPlayerVersion } from './env';
import type { MuxDataSdk } from './types';

const MUX_VIDEO_DOMAIN = 'mux.com';

export interface MuxMediaProps extends HlsMediaProps {
  playbackId: string | null;
  customDomain: string;
  MuxDataSdk: MuxDataSdk | undefined;
  beaconCollectionDomain: string | undefined;
  disableCookies: boolean;
  envKey: string | undefined;
  playerSoftwareName: string | undefined;
  playerSoftwareVersion: string | undefined;
  playerInitTime: number | undefined;
  metadata: Record<string, any> | undefined;
}

export function MuxMediaMixin<Base extends AnyConstructor<any>>(BaseClass: Base) {
  const HlsBase = HlsMediaMixin(BaseClass);

  class MuxMediaImpl extends (HlsBase as unknown as Constructor<HlsMediaProps>) {
    static PLAYER_SOFTWARE_NAME = '';

    #MuxDataSdk: MuxDataSdk | undefined = Mux;
    #MuxDataSdkInitializedBefore: boolean = false;
    #playbackId: string | null = null;
    #customDomain: string = MUX_VIDEO_DOMAIN;
    #beaconCollectionDomain: string | undefined;
    #disableCookies: boolean = false;
    #metadata: Record<string, any> | undefined;
    #envKey: string | undefined;
    #playerSoftwareName: string | undefined = (this.constructor as typeof MuxMediaImpl).PLAYER_SOFTWARE_NAME;
    #playerSoftwareVersion: string | undefined = getPlayerVersion();
    #playerInitTime: number | undefined = this.#generatePlayerInitTime();

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

    get MuxDataSdk() {
      return this.#MuxDataSdk;
    }

    set MuxDataSdk(value) {
      this.#MuxDataSdk = value;
    }

    get beaconCollectionDomain(): string | undefined {
      return this.#beaconCollectionDomain;
    }

    set beaconCollectionDomain(value: string | undefined) {
      this.#beaconCollectionDomain = value;
    }

    get disableCookies(): boolean {
      return this.#disableCookies;
    }

    set disableCookies(value: boolean) {
      this.#disableCookies = value;
    }

    get envKey(): string | undefined {
      return this.#envKey;
    }

    set envKey(value: string | undefined) {
      this.#envKey = value;
    }

    get playerSoftwareName(): string | undefined {
      return this.#playerSoftwareName;
    }

    set playerSoftwareName(value: string | undefined) {
      this.#playerSoftwareName = value;
    }

    get playerSoftwareVersion(): string | undefined {
      return this.#playerSoftwareVersion;
    }

    set playerSoftwareVersion(value: string | undefined) {
      this.#playerSoftwareVersion = value;
    }

    get playerInitTime(): number | undefined {
      return this.#playerInitTime;
    }

    set playerInitTime(value: number | undefined) {
      this.#playerInitTime = value;
    }

    get metadata(): Record<string, any> | undefined {
      return this.#metadata;
    }

    set metadata(value: Record<string, any> | undefined) {
      this.#metadata = value;
    }

    attach(target: HTMLMediaElement): void {
      super.attach(target);

      // Only initialize Mux Data SDK if it was already initialized before in attach,
      // the first initializeMuxDataSdk call should be done in the deferred load hook
      // so all the properties are set before the Mux Data SDK is initialized.
      if (this.#MuxDataSdkInitializedBefore) {
        this.#initializeMuxDataSdk();
      }
    }

    detach(): void {
      const target = this.target as HTMLMediaElement | null;
      if (target?.mux) {
        target.mux.destroy();
        delete target.mux;
      }
      super.detach();
    }

    load(): void {
      super.load();
      this.#initializeMuxDataSdk();
    }

    #syncSrc(): void {
      this.src = this.#playbackId ? toSrc(this.#playbackId, this.#customDomain) : '';
    }

    #initializeMuxDataSdk(): void {
      const target = this.target as HTMLMediaElement;

      if (!this.MuxDataSdk || !target || (target.mux && !target.mux.deleted)) return;

      this.#MuxDataSdkInitializedBefore = true;

      const {
        debug,
        beaconCollectionDomain,
        disableCookies,
        engine: hlsjs,
        envKey: env_key,
        playerSoftwareName: player_software_name,
        playerSoftwareVersion: player_software_version,
        playerInitTime: player_init_time,
        metadata = {},
      } = this;

      const { view_session_id = this.MuxDataSdk?.utils.generateUUID() } = metadata;
      const video_id = toVideoId(this as any);
      metadata.view_session_id = view_session_id;
      metadata.video_id = video_id;

      this.MuxDataSdk?.monitor(target, {
        debug,
        ...(beaconCollectionDomain ? { beaconCollectionDomain } : {}),
        ...(disableCookies ? { disableCookies } : {}),
        ...(hlsjs ? { hlsjs } : {}),
        Hls,
        data: {
          ...(env_key ? { env_key } : {}),
          ...(player_software_name ? { player_software_name } : {}),
          // NOTE: Adding this because there appears to be some instability on whether
          // player_software_name or player_software "wins" for Mux Data (CJP)
          ...(player_software_name ? { player_software: player_software_name } : {}),
          ...(player_software_version ? { player_software_version } : {}),
          ...(player_init_time ? { player_init_time } : {}),
          ...metadata,
        },
      });
    }

    #generatePlayerInitTime(): number | undefined {
      if (!this.MuxDataSdk) return undefined;
      return this.MuxDataSdk.utils.now();
    }
  }

  return MuxMediaImpl as unknown as MixinReturn<Base, MuxMediaProps> & { PLAYER_SOFTWARE_NAME: string };
}

function toSrc(playbackId: string, customDomain: string): string {
  return `https://stream.${customDomain}/${playbackId}.m3u8`;
}

type MuxSrcProps = Pick<MuxMediaBase, 'playbackId' | 'src' | 'customDomain'>;

export function toVideoId(props: MuxSrcProps & Pick<MuxMediaBase, 'metadata'>): string | undefined {
  if (props.metadata?.video_id) return props.metadata.video_id;
  if (!isMuxVideoSrc(props)) return props.src;
  return toPlaybackIdFromParameterized(props.playbackId) ?? toPlaybackIdFromSrc(props.src) ?? props.src;
}

function toPlaybackIdFromParameterized(playbackId: MuxMediaBase['playbackId']): string | undefined {
  if (!playbackId) return undefined;
  const [id] = playbackId.split('?');
  return id || undefined;
}

export function toPlaybackIdFromSrc(src: MuxMediaBase['src']): string | undefined {
  if (!src || !src.startsWith('https://stream.')) return undefined;
  const [playbackId] = new URL(src).pathname.slice(1).split(/\.m3u8|\//);
  return playbackId || undefined;
}

export function isMuxVideoSrc({ playbackId, src, customDomain }: MuxSrcProps): boolean {
  if (playbackId) return true;
  if (typeof src !== 'string') return false;
  const base = window?.location.href;
  const hostname = new URL(src, base).hostname.toLocaleLowerCase();

  return hostname.includes(MUX_VIDEO_DOMAIN) || (!!customDomain && hostname.includes(customDomain.toLocaleLowerCase()));
}

// These are used to infer the props from.
export class MuxMediaBase extends MuxMediaMixin(EventTarget) {
  static override PLAYER_SOFTWARE_NAME = '';
}

export class MuxVideoBase extends MuxMediaBase {
  static override PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudioBase extends MuxMediaBase {
  static override PLAYER_SOFTWARE_NAME = 'mux-audio';
}

// These are used by the web components because it needs to extend HTMLElement!
export class MuxCustomMedia extends MuxMediaMixin(CustomVideoElement) {}

export class MuxCustomVideo extends MuxMediaMixin(CustomVideoElement) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxCustomAudio extends MuxMediaMixin(CustomAudioElement) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}

// These are used by the React components.
export class MuxMedia extends MuxMediaMixin(VideoProxy) {}

export class MuxVideo extends MuxMediaMixin(VideoProxy) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudio extends MuxMediaMixin(AudioProxy) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
