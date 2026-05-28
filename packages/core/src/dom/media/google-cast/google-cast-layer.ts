import { isCaptionOrSubtitleTrack } from '@videojs/utils/dom';
import type { ExtensionConfig } from '../../../core/media/media-extension';
import type { HTMLAudioElementHost } from '../html-audio-element-host';
import { HTMLMediaElementLayer } from '../html-media-element-layer';
import type { HTMLVideoElementHost } from '../html-video-element-host';
import type { GoogleCast } from './index';
import { RemotePlayback, type RemotePlaybackHooks } from './remote-playback';
import {
  castContext,
  currentMedia,
  currentSession,
  editTracksInfo,
  getMediaStatus,
  getPlaylistSegmentFormat,
  IterableWeakSet,
  isHls,
  NotSupportedError,
  onCastApiAvailable,
  setCastOptions,
  setPlaybackRate,
} from './utils';

type RemotePlayerListener = (event?: cast.framework.RemotePlayerChangedEvent) => void;
export type GoogleCastMedia = HTMLVideoElementHost | HTMLAudioElementHost;

type GoogleCastConfig = ExtensionConfig<GoogleCast>;

const layerInstances = new IterableWeakSet<GoogleCastLayer>();

let cf: typeof cast.framework | undefined;

onCastApiAvailable(() => {
  if (!globalThis.chrome?.cast?.isAvailable) {
    if (__DEV__) console.debug('chrome.cast.isAvailable', globalThis.chrome?.cast?.isAvailable);
    return;
  }

  if (!cf) {
    cf = cast.framework;

    castContext()!.addEventListener(cf.CastContextEventType.CAST_STATE_CHANGED, () => {
      layerInstances.forEach((s) => s.onCastStateChanged());
    });

    castContext()!.addEventListener(cf.CastContextEventType.SESSION_STATE_CHANGED, () => {
      layerInstances.forEach((s) => s.onSessionStateChanged());
    });

    layerInstances.forEach((s) => s.init());
  }
});

/**
 * Cast layer + lifecycle. Sits in the host's layer chain for the lifetime of
 * the extension. While a cast session is connected, overridden getters/setters
 * route through the cast receiver; otherwise they delegate to `super` (the
 * layer below). Also owns the cast framework integration, the `RemotePlayback`
 * instance exposed via {@link GoogleCastLayer.remote}, and dispatches media
 * events on the host while casting.
 */
export class GoogleCastLayer extends HTMLMediaElementLayer {
  #googleCast: GoogleCastConfig;
  #hooks: Partial<RemotePlaybackHooks> = {};
  #remotePlayback: RemotePlayback;
  #isInit = false;
  #isCasting = false;
  #seeking = false;
  #remotePlayer!: cast.framework.RemotePlayer;
  #remoteListeners!: Record<string, RemotePlayerListener>;
  #listenersAttached = false;
  #playbackRate = 1;
  #localPaused = false;
  #onTextTrackChange = () => this.#updateRemoteTextTrack();
  #onMediaUpdate = () => this.#checkPlaybackRate();

  constructor(googleCast: GoogleCastConfig) {
    super();
    this.#googleCast = googleCast;
    this.#remotePlayback = new RemotePlayback(this);
    layerInstances.add(this);
    this.init();
  }

  override get remote() {
    return this.#remotePlayback;
  }

  /** @internal Wires up callbacks pushed from {@link RemotePlayback}; not part of the public surface. */
  bindHooks(hooks: Partial<RemotePlaybackHooks>) {
    Object.assign(this.#hooks, hooks);
  }

  hasDevicesAvailable() {
    const state = castContext()?.getCastState();
    return !!state && state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
  }

  destroy() {
    layerInstances.delete(this);
    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.textTracks.removeEventListener('change', this.#onTextTrackChange);
    this.#detachRemoteListeners();
    this.#isCasting = false;
    this.#isInit = false;
  }

  async requestCastSession() {
    if (!this.#isCastApiAvailable()) {
      throw new NotSupportedError('The RemotePlayback API is disabled on this platform.');
    }

    const willDisconnect = this.#isCasting;
    this.#isCasting = true;

    this.#applyCastOptions();
    this.#attachRemoteListeners();

    try {
      await castContext()!.requestSession();
    } catch (err) {
      if (!willDisconnect) {
        this.#isCasting = false;
      }

      if (err === 'cancel') {
        return;
      }

      throw new Error(err as string);
    }

    this.#localPaused = super.paused;
    super.pause();
    this.muted = super.muted;

    try {
      await this.load();
    } catch (err) {
      console.error(err);
    }
  }

  override async load() {
    if (!this.#isCasting) {
      await super.load();
      return;
    }

    if (!this.#googleCast.src) {
      // TODO: handle unloading the media?
      return;
    }

    const mediaInfo = new chrome.cast.media.MediaInfo(this.#googleCast.src, this.#googleCast.contentType ?? '');
    mediaInfo.customData = this.#googleCast.customData ?? null;

    const { target } = this;
    const subtitles = [...(target?.querySelectorAll('track') ?? [])].filter(
      (el) => el.src && isCaptionOrSubtitleTrack(el)
    );

    const { Track, TrackType, TextTrackType } = chrome.cast.media;
    const activeTrackIds: number[] = [];

    if (subtitles.length) {
      mediaInfo.tracks = subtitles.map((el, i) => {
        const trackId = i + 1;
        if (!activeTrackIds.length && el.track.mode === 'showing') activeTrackIds.push(trackId);

        const track = new Track(trackId, TrackType.TEXT);
        track.trackContentId = el.src;
        track.trackContentType = 'text/vtt';
        track.subtype = el.kind === 'captions' ? TextTrackType.CAPTIONS : TextTrackType.SUBTITLES;
        track.name = el.label;
        track.language = el.srclang;
        return track;
      });
    }

    mediaInfo.streamType =
      this.#googleCast.streamType === 'live'
        ? chrome.cast.media.StreamType.LIVE
        : chrome.cast.media.StreamType.BUFFERED;

    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.images = [new chrome.cast.Image((target as HTMLVideoElement | null)?.poster ?? '')];

    if (await isHls(this.#googleCast.src)) {
      mediaInfo.contentType ||= 'application/x-mpegURL';

      const fmt = (await getPlaylistSegmentFormat(this.#googleCast.src)) ?? '';
      const { HlsSegmentFormat: HS, HlsVideoSegmentFormat: HVS } = chrome.cast.media;

      if (fmt.includes('m4s') || fmt.includes('mp4')) {
        mediaInfo.hlsSegmentFormat = HS.FMP4;
        mediaInfo.hlsVideoSegmentFormat = HVS.FMP4;
      } else if (fmt.includes('ts')) {
        mediaInfo.hlsSegmentFormat = HS.TS;
        mediaInfo.hlsVideoSegmentFormat = HVS.TS;
      }
    }

    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    // Use `super.currentTime` to read the local element's time even though our
    // own `currentTime` getter is overridden to return the remote player's.
    request.currentTime = super.currentTime;
    request.autoplay = !this.#localPaused;
    request.activeTrackIds = activeTrackIds;

    await currentSession()?.loadMedia(request);

    this.dispatchEvent(new Event('volumechange'));
  }

  override get paused() {
    if (!this.#isCasting || !this.#remotePlayer.isMediaLoaded) return super.paused;
    return this.#remotePlayer.isPaused || this.ended;
  }

  override get ended() {
    if (!this.#isCasting) return super.ended;
    return (
      this.#remotePlayer.playerState === chrome.cast.media.PlayerState.IDLE &&
      currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED
    );
  }

  override get seeking() {
    if (!this.#isCasting) return super.seeking;
    return this.#seeking;
  }

  override get readyState() {
    if (!this.#isCasting) return super.readyState;
    switch (this.#remotePlayer.playerState) {
      case chrome.cast.media.PlayerState.IDLE:
        return 0;
      case chrome.cast.media.PlayerState.BUFFERING:
        return 2;
      default:
        return 3;
    }
  }

  override get duration() {
    if (!this.#isCasting || !this.#remotePlayer.isMediaLoaded) return super.duration;
    return this.#remotePlayer.duration ?? NaN;
  }

  override get currentTime() {
    if (!this.#isCasting || !this.#remotePlayer.isMediaLoaded) return super.currentTime;
    return this.#remotePlayer.currentTime ?? 0;
  }

  override set currentTime(value: number) {
    if (!this.#isCasting) {
      super.currentTime = value;
      return;
    }
    this.#remotePlayer.currentTime = value;
    this.#notifySeeking();
    this.#remotePlayer.controller?.seek();
  }

  override get muted() {
    if (!this.#isCasting) return super.muted;
    return this.#remotePlayer.isMuted;
  }

  override set muted(value: boolean) {
    if (!this.#isCasting) {
      super.muted = value;
      return;
    }
    if (value !== this.#remotePlayer.isMuted) {
      this.#remotePlayer.controller?.muteOrUnmute();
    }
  }

  override get volume() {
    if (!this.#isCasting) return super.volume;
    return this.#remotePlayer.volumeLevel ?? 1;
  }

  override set volume(value: number) {
    if (!this.#isCasting) {
      super.volume = value;
      return;
    }
    this.#remotePlayer.volumeLevel = +value;
    this.#remotePlayer.controller?.setVolumeLevel();
  }

  override get playbackRate() {
    if (!this.#isCasting) return super.playbackRate;
    return currentMedia()?.playbackRate ?? 1;
  }

  override set playbackRate(value: number) {
    if (!this.#isCasting) {
      super.playbackRate = value;
      return;
    }
    setPlaybackRate(value);
  }

  override async play() {
    if (!this.#isCasting) return super.play();
    // When a casted media ends, the media is unloaded and the player state is IDLE.
    if (!this.#remotePlayer.isMediaLoaded) {
      this.#localPaused = false;
      await this.load();
      return;
    }
    if (this.paused) {
      this.#remotePlayer.controller?.playOrPause();
      return new Promise<void>((resolve) => {
        this.addEventListener('play', () => resolve(), { once: true });
      });
    }
  }

  override pause() {
    if (!this.#isCasting) {
      super.pause();
      return;
    }
    if (!this.paused) {
      this.#remotePlayer.controller?.playOrPause();
    }
  }

  init() {
    if (!cf || this.#isInit) return;
    this.#isInit = true;

    this.#applyCastOptions();

    this.textTracks.addEventListener('change', this.#onTextTrackChange);

    this.onCastStateChanged();

    this.#remotePlayer = new cf.RemotePlayer();
    new cf.RemotePlayerController(this.#remotePlayer);

    this.#remoteListeners = {
      [cf.RemotePlayerEventType.IS_CONNECTED_CHANGED]: (event?: cast.framework.RemotePlayerChangedEvent) => {
        const value = event?.value;
        if (value === true) {
          this.#hooks.setState?.('connected');
        } else {
          this.#disconnect();
          this.#hooks.setState?.('disconnected');
        }
      },
      [cf.RemotePlayerEventType.DURATION_CHANGED]: () => {
        this.dispatchEvent(new Event('durationchange'));
      },
      [cf.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]: () => {
        this.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.IS_MUTED_CHANGED]: () => {
        this.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.CURRENT_TIME_CHANGED]: () => {
        if (!this.#isCasting || !this.#remotePlayer.isMediaLoaded) return;
        this.#notifySeeked();
        this.dispatchEvent(new Event('timeupdate'));
      },
      [cf.RemotePlayerEventType.VIDEO_INFO_CHANGED]: () => {
        this.dispatchEvent(new Event('resize'));
      },
      [cf.RemotePlayerEventType.IS_PAUSED_CHANGED]: () => {
        this.dispatchEvent(new Event(this.#isCasting && this.#remotePlayer.isPaused ? 'pause' : 'play'));
      },
      [cf.RemotePlayerEventType.PLAYER_STATE_CHANGED]: () => {
        const PS = chrome.cast.media.PlayerState;
        const state = this.#isCasting ? this.#remotePlayer.playerState : undefined;

        if (state !== PS.BUFFERING) this.#notifySeeked();
        if (state === PS.PAUSED) return;

        if (state === PS.IDLE) {
          const finished = currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED;
          this.dispatchEvent(new Event(finished ? 'ended' : 'emptied'));
          return;
        }

        if (state === PS.PLAYING) this.dispatchEvent(new Event('playing'));
        else if (state === PS.BUFFERING) this.dispatchEvent(new Event('waiting'));
      },
      [cf.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]: async () => {
        if (!this.#isCasting || !this.#remotePlayer.isMediaLoaded) return;

        await Promise.resolve();
        this.#onRemoteMediaLoaded();
      },
    };
  }

  onCastStateChanged() {
    if (!this.#isInit) return;
    const CS = cast.framework.CastState;
    const state = castContext()!.getCastState();

    if (this.#isCasting && state === CS.CONNECTING) {
      this.#hooks.setState?.('connecting');
    }

    this.#hooks.setAvailable?.(!!state && state !== CS.NO_DEVICES_AVAILABLE);
  }

  async onSessionStateChanged() {
    if (!this.#isInit) return;
    const { SESSION_RESUMED } = cf!.SessionState;
    if (castContext()!.getSessionState() === SESSION_RESUMED) {
      if (this.#googleCast.src === currentMedia()?.media?.contentId) {
        this.#isCasting = true;

        this.#attachRemoteListeners();

        try {
          await getMediaStatus(new chrome.cast.media.GetStatusRequest());
        } catch (error) {
          console.error(error);
        }

        this.#remoteListeners[cf!.RemotePlayerEventType.IS_PAUSED_CHANGED]!();
        this.#remoteListeners[cf!.RemotePlayerEventType.PLAYER_STATE_CHANGED]!();
        this.dispatchEvent(new Event('ratechange'));

        // TODO: sync remote enabled text track state to local text tracks
      }
    }
  }

  #isCastApiAvailable() {
    return Boolean(globalThis.chrome?.cast?.isAvailable);
  }

  #applyCastOptions() {
    const { receiverApplicationId } = this.#googleCast;
    setCastOptions(receiverApplicationId ? { receiverApplicationId } : {});
  }

  // CAF's RemotePlayerController does not deduplicate handlers, so we guard
  // attach/detach with a flag to prevent duplicate event dispatches across
  // cancel/retry and stop-casting flows.
  #attachRemoteListeners() {
    if (this.#listenersAttached) return;
    const controller = this.#remotePlayer?.controller;
    if (!controller) return;

    for (const [type, handler] of Object.entries(this.#remoteListeners)) {
      controller.addEventListener(type as cast.framework.RemotePlayerEventType, handler);
    }
    this.#listenersAttached = true;
  }

  #detachRemoteListeners() {
    if (!this.#listenersAttached) return;
    const controller = this.#remotePlayer?.controller;

    if (controller) {
      for (const [type, handler] of Object.entries(this.#remoteListeners)) {
        controller.removeEventListener(type as cast.framework.RemotePlayerEventType, handler);
      }
    }
    this.#listenersAttached = false;
  }

  #disconnect() {
    if (!this.#isCasting) return;

    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.#detachRemoteListeners();
    this.#seeking = false;
    this.#playbackRate = 1;
    this.#isCasting = false;

    super.muted = this.#remotePlayer.isMuted;
    const saved = this.#remotePlayer.savedPlayerState;
    if (saved) {
      super.currentTime = saved.currentTime;
      if (saved.isPaused === false) super.play();
    }
  }

  #notifySeeking() {
    this.#seeking = true;
    this.dispatchEvent(new Event('seeking'));
  }

  #notifySeeked() {
    if (!this.#seeking) return;
    this.#seeking = false;
    this.dispatchEvent(new Event('seeked'));
  }

  #onRemoteMediaLoaded() {
    this.#playbackRate = currentMedia()?.playbackRate ?? 1;
    currentMedia()?.addUpdateListener(this.#onMediaUpdate);
    this.#updateRemoteTextTrack();
  }

  #checkPlaybackRate() {
    const rate = currentMedia()?.playbackRate ?? 1;
    if (rate !== this.#playbackRate) {
      this.#playbackRate = rate;
      this.dispatchEvent(new Event('ratechange'));
    }
  }

  async #updateRemoteTextTrack() {
    if (!this.#isCasting || !this.target) return;

    const localSubs = [...this.textTracks].filter(isCaptionOrSubtitleTrack);

    const matched = (this.#remotePlayer.mediaInfo?.tracks ?? [])
      .filter(({ type }) => type === chrome.cast.media.TrackType.TEXT)
      .flatMap(({ language, name, trackId }) => {
        const local = localSubs.find((l) => l.language === language && l.label === name);
        return local?.mode ? [{ mode: local.mode, trackId }] : [];
      });

    const hidden = new Set(matched.filter((m) => m.mode !== 'showing').map((m) => m.trackId));
    const showing = matched.find((m) => m.mode === 'showing')?.trackId;

    const active = currentSession()?.getSessionObj().media[0]?.activeTrackIds ?? [];
    const next = new Set(active.filter((id) => !hidden.has(id)));
    if (showing) next.add(showing);

    if (next.size === active.length && active.every((id) => next.has(id))) return;

    try {
      await editTracksInfo(new chrome.cast.media.EditTracksInfoRequest([...next]));
    } catch (error) {
      console.error(error);
    }
  }
}
