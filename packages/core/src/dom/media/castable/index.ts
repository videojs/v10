import type { Constructor } from '@videojs/utils/types';

import { RemotePlayback } from './remote-playback';
import type { CastableMediaElement, CastableMediaProps, CastableMediaSuperclass } from './types';
import type { CastOptions } from './utils';
import {
  currentSession,
  getDefaultCastOptions,
  getPlaylistSegmentFormat,
  isHls,
  loadCastFramework,
  privateProps,
  requiresCastFramework,
} from './utils';

export type { CastableMediaElement } from './types';

export const CastableMediaMixin = <Base extends CastableMediaSuperclass>(
  superclass: Base
): Base & Constructor<CastableMediaProps> => {
  class CastableMedia extends superclass {
    #localState = { paused: false };
    #castOptions = getDefaultCastOptions();
    #castCustomData: Record<string, unknown> | null | undefined;
    #castSrc: string | undefined;
    #castContentType: string | undefined;
    #castStreamType: string | undefined;
    #castReceiver: string | undefined;
    #remote: RemotePlayback | null | undefined;

    get remote(): RemotePlayback | undefined {
      if (this.#remote) return this.#remote;

      if (requiresCastFramework()) {
        if (!this.target) return undefined;

        if (!this.disableRemotePlayback) {
          loadCastFramework();
        }

        privateProps.set(this, {
          loadOnPrompt: () => this.#loadOnPrompt(),
        });

        return (this.#remote = new RemotePlayback(this as unknown as CastableMediaElement));
      }

      return undefined;
    }

    get #castPlayer(): cast.framework.RemotePlayer | undefined {
      return privateProps.get(this.remote!)?.getCastPlayer?.() as cast.framework.RemotePlayer | undefined;
    }

    attach(target: HTMLMediaElement): void {
      super.attach(target);

      if (requiresCastFramework() && !this.disableRemotePlayback) {
        loadCastFramework();
      }
    }

    detach(): void {
      super.detach();
    }

    destroy(): void {
      this.#remote?.destroy();
      this.#remote = null;
      privateProps.delete(this);
      super.destroy();
    }

    async #loadOnPrompt(): Promise<void> {
      this.#localState.paused = super.paused;
      super.pause();

      this.muted = super.muted;

      try {
        await this.load();
      } catch (err) {
        console.error(err);
      }
    }

    async load(): Promise<void> {
      if (!this.#castPlayer) return super.load() as void;

      const mediaInfo = new chrome.cast.media.MediaInfo(this.castSrc, this.castContentType ?? '');
      mediaInfo.customData = (this.castCustomData as object) ?? null;

      const subtitles = [...this.querySelectorAll('track')].filter(
        (el): el is HTMLTrackElement =>
          el instanceof HTMLTrackElement && !!el.src && (el.kind === 'subtitles' || el.kind === 'captions')
      );

      const activeTrackIds: number[] = [];
      let textTrackIdCount = 0;

      if (subtitles.length) {
        mediaInfo.tracks = subtitles.map((trackEl) => {
          const trackId = ++textTrackIdCount;
          if (activeTrackIds.length === 0 && trackEl.track.mode === 'showing') {
            activeTrackIds.push(trackId);
          }

          const track = new chrome.cast.media.Track(trackId, chrome.cast.media.TrackType.TEXT);
          track.trackContentId = trackEl.src;
          track.trackContentType = 'text/vtt';
          track.subtype =
            trackEl.kind === 'captions'
              ? chrome.cast.media.TextTrackType.CAPTIONS
              : chrome.cast.media.TextTrackType.SUBTITLES;
          track.name = trackEl.label;
          track.language = trackEl.srclang;
          return track;
        });
      }

      if (this.castStreamType === 'live') {
        mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
      } else {
        mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;
      }

      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = this.title;
      mediaInfo.metadata.images = [new chrome.cast.Image(this.poster)];

      if (await isHls(this.castSrc)) {
        const segmentFormat = await getPlaylistSegmentFormat(this.castSrc);
        const isFragmentedMP4 = segmentFormat?.includes('m4s') || segmentFormat?.includes('mp4');
        if (isFragmentedMP4) {
          mediaInfo.hlsSegmentFormat = chrome.cast.media.HlsSegmentFormat.FMP4;
          mediaInfo.hlsVideoSegmentFormat = chrome.cast.media.HlsVideoSegmentFormat.FMP4;
        } else if (segmentFormat?.includes('ts')) {
          mediaInfo.hlsSegmentFormat = chrome.cast.media.HlsSegmentFormat.TS;
          mediaInfo.hlsVideoSegmentFormat = chrome.cast.media.HlsVideoSegmentFormat.TS;
        }
      }

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.currentTime = super.currentTime ?? 0;
      request.autoplay = !this.#localState.paused;
      request.activeTrackIds = activeTrackIds;

      await currentSession()?.loadMedia(request);

      this.dispatchEvent(new Event('volumechange'));
    }

    play(): void | Promise<void | undefined> {
      if (this.#castPlayer) {
        if (this.#castPlayer.isPaused) {
          this.#castPlayer.controller?.playOrPause();
        }
        return;
      }
      return super.play();
    }

    pause(): void {
      if (this.#castPlayer) {
        if (!this.#castPlayer.isPaused) {
          this.#castPlayer.controller?.playOrPause();
        }
        return;
      }
      super.pause();
    }

    get castOptions(): CastOptions {
      return this.#castOptions;
    }

    get castReceiver(): string | undefined {
      return this.#castReceiver;
    }

    set castReceiver(val: string | undefined) {
      if (this.#castReceiver === val) return;
      this.#castReceiver = val;
      if (val) {
        this.#castOptions.receiverApplicationId = val;
      }
    }

    get castSrc(): string {
      return this.#castSrc ?? this.src ?? this.currentSrc;
    }

    set castSrc(val: string) {
      if (this.#castSrc === val) return;
      this.#castSrc = val;
      if (this.#castPlayer) this.load();
    }

    get castContentType(): string | undefined {
      return this.#castContentType;
    }

    set castContentType(val: string | undefined) {
      this.#castContentType = val;
    }

    get castStreamType(): string | undefined {
      return this.#castStreamType ?? this.streamType;
    }

    set castStreamType(val: string | undefined) {
      if (this.#castStreamType === val) return;
      this.#castStreamType = val;
      if (this.#castPlayer) this.load();
    }

    get castCustomData(): Record<string, unknown> | null | undefined {
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

    get poster(): string {
      return (this.target as HTMLVideoElement | null)?.poster ?? '';
    }

    get title(): string {
      return this.target?.title ?? '';
    }

    get seeking(): boolean {
      if (this.#castPlayer) return privateProps.get(this.remote!)?.isSeeking?.() ?? false;
      return super.seeking;
    }

    get readyState(): number {
      if (this.#castPlayer) {
        switch (this.#castPlayer.playerState) {
          case chrome.cast.media.PlayerState.IDLE:
            return 0;
          case chrome.cast.media.PlayerState.BUFFERING:
            return 2;
          default:
            return 3;
        }
      }
      return super.readyState;
    }

    get paused(): boolean {
      if (this.#castPlayer) return this.#castPlayer.isPaused;
      return super.paused;
    }

    get muted(): boolean {
      if (this.#castPlayer) return this.#castPlayer.isMuted;
      return super.muted;
    }

    set muted(val: boolean) {
      if (this.#castPlayer) {
        if ((val && !this.#castPlayer.isMuted) || (!val && this.#castPlayer.isMuted)) {
          this.#castPlayer.controller?.muteOrUnmute();
        }
        return;
      }
      super.muted = val;
    }

    get volume(): number {
      if (this.#castPlayer) return this.#castPlayer.volumeLevel ?? 1;
      return super.volume;
    }

    set volume(val: number) {
      if (this.#castPlayer) {
        this.#castPlayer.volumeLevel = +val;
        this.#castPlayer.controller?.setVolumeLevel();
        return;
      }
      super.volume = val;
    }

    get duration(): number {
      if (this.#castPlayer?.isMediaLoaded) {
        return this.#castPlayer.duration ?? NaN;
      }
      return super.duration;
    }

    get currentTime(): number {
      if (this.#castPlayer?.isMediaLoaded) {
        return this.#castPlayer.currentTime ?? 0;
      }
      return super.currentTime;
    }

    set currentTime(val: number) {
      if (this.#castPlayer) {
        this.#castPlayer.currentTime = val;
        privateProps.get(this.remote!)?.notifySeeking?.();
        this.#castPlayer.controller?.seek();
        return;
      }
      super.currentTime = val;
    }
  }

  return CastableMedia as unknown as Base & Constructor<CastableMediaProps>;
};
