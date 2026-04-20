import type { MixinReturn } from '@videojs/utils/types';
import type { RemotePlaybackLike } from '../../../core/media/types';
import { GoogleCastProvider } from './google-cast-provider';
import { RemotePlayback } from './remote-playback';
import type { GoogleCastMedia, GoogleCastMediaHostConstructor } from './types';
import { getDefaultCastOptions, loadCastFramework, requiresCastFramework } from './utils';

export type { GoogleCastMediaElement } from './types';

export const GoogleCastMixin = <Base extends GoogleCastMediaHostConstructor>(
  superclass: Base
): MixinReturn<Base, GoogleCastMedia> => {
  class GoogleCastMedia extends superclass {
    #castOptions = getDefaultCastOptions();
    #castCustomData: Record<string, unknown> | null | undefined;
    #castSrc: string | undefined;
    #castContentType: string | undefined;
    #castStreamType: string | undefined;
    #castReceiver: string | undefined;
    #remote: RemotePlayback | null | undefined;
    #provider: GoogleCastProvider | null | undefined;
    #destroyed = false;

    get remote(): RemotePlayback | RemotePlaybackLike | undefined {
      if (this.#remote) return this.#remote;
      if (this.#destroyed) return super.remote;

      if (requiresCastFramework()) {
        if (!this.disableRemotePlayback) {
          loadCastFramework();
        }

        this.#provider = new GoogleCastProvider(this, {
          duration: () => super.duration,
          currentTime: () => super.currentTime,
          paused: () => super.paused,
          muted: () => super.muted,
          pause: () => super.pause(),
        });
        return (this.#remote = new RemotePlayback(this.#provider));
      }

      return super.remote;
    }

    attach(target: HTMLMediaElement) {
      super.attach(target);

      if (requiresCastFramework() && !this.disableRemotePlayback) {
        loadCastFramework();
      }
    }

    detach() {
      super.detach();
    }

    destroy() {
      this.#provider?.destroy();
      this.#provider = null;
      this.#remote = null;
      this.#destroyed = true;
      super.destroy();
    }

    async load() {
      if (!this.#provider?.isCasting) return super.load();
      return this.#provider.load();
    }

    play() {
      if (this.#provider?.isCasting) {
        return this.#provider.play();
      }
      return super.play();
    }

    pause() {
      if (this.#provider?.isCasting) {
        this.#provider.pause();
        return;
      }
      super.pause();
    }

    get castOptions() {
      return this.#castOptions;
    }

    get castReceiver() {
      return this.#castReceiver;
    }

    set castReceiver(val: string | undefined) {
      if (this.#castReceiver === val) return;
      this.#castReceiver = val;

      if (val) {
        this.#castOptions.receiverApplicationId = val;
      }
    }

    get castSrc() {
      return this.#castSrc ?? this.querySelector('source')?.src ?? this.src ?? this.currentSrc;
    }

    set castSrc(val: string) {
      if (this.#castSrc === val) return;
      this.#castSrc = val;

      if (this.#provider?.isCasting) this.load();
    }

    get castContentType() {
      return this.#castContentType;
    }

    set castContentType(val: string | undefined) {
      this.#castContentType = val;
    }

    get castStreamType() {
      return this.#castStreamType ?? this.streamType;
    }

    set castStreamType(val: string | undefined) {
      if (this.#castStreamType === val) return;
      this.#castStreamType = val;

      if (this.#provider?.isCasting) this.load();
    }

    get castCustomData() {
      return this.#castCustomData;
    }

    set castCustomData(val: Record<string, unknown> | null | undefined) {
      const valType = typeof val;
      if (!['object', 'undefined'].includes(valType)) {
        console.error(`castCustomData must be nullish or an object but value was of type ${valType}`);
        return;
      }

      this.#castCustomData = val;
    }

    get seeking() {
      if (this.#provider?.isCasting) return this.#provider.seeking;
      return super.seeking;
    }

    get readyState() {
      if (this.#provider?.isCasting) return this.#provider.readyState;
      return super.readyState;
    }

    get paused() {
      if (this.#provider?.isCasting) return this.#provider.paused;
      return super.paused;
    }

    get ended() {
      if (this.#provider?.isCasting) return this.#provider.ended;
      return super.ended;
    }

    get muted() {
      if (this.#provider?.isCasting) return this.#provider.muted;
      return super.muted;
    }

    set muted(val: boolean) {
      if (this.#provider?.isCasting) {
        this.#provider.muted = val;
        return;
      }
      super.muted = val;
    }

    get volume() {
      if (this.#provider?.isCasting) return this.#provider.volume;
      return super.volume;
    }

    set volume(val: number) {
      if (this.#provider?.isCasting) {
        this.#provider.volume = val;
        return;
      }
      super.volume = val;
    }

    get playbackRate() {
      if (this.#provider?.isCasting) return this.#provider.playbackRate;
      return super.playbackRate;
    }

    set playbackRate(val: number) {
      if (this.#provider?.isCasting) {
        this.#provider.playbackRate = val;
        return;
      }
      super.playbackRate = val;
    }

    get duration() {
      if (this.#provider?.isCasting) return this.#provider.duration;
      return super.duration;
    }

    get currentTime() {
      if (this.#provider?.isCasting) return this.#provider.currentTime;
      return super.currentTime;
    }

    set currentTime(val: number) {
      if (this.#provider?.isCasting) {
        this.#provider.currentTime = val;
        return;
      }
      super.currentTime = val;
    }
  }

  return GoogleCastMedia as unknown as MixinReturn<Base, GoogleCastMedia>;
};
