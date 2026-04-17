import type { RemotePlaybackState } from './remote-playback';
import type { CastableMediaElement } from './types';
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

export type GoogleCastProviderHooks = {
  setState: (next: RemotePlaybackState) => void;
  setAvailable: (available: boolean) => void;
};

export type LocalPlayer = {
  duration: () => number;
  currentTime: () => number;
  paused: () => boolean;
  muted: () => boolean;
  pause: () => void;
};

const providerInstances = new IterableWeakSet<GoogleCastProvider>();
const castElementRef = new WeakSet<CastableMediaElement>();

let cf: typeof cast.framework | undefined;

onCastApiAvailable(() => {
  if (!globalThis.chrome?.cast?.isAvailable) {
    console.debug('chrome.cast.isAvailable', globalThis.chrome?.cast?.isAvailable);
    return;
  }

  if (!cf) {
    cf = cast.framework;

    castContext()!.addEventListener(cf.CastContextEventType.CAST_STATE_CHANGED, () => {
      providerInstances.forEach((p) => p.onCastStateChanged());
    });

    castContext()!.addEventListener(cf.CastContextEventType.SESSION_STATE_CHANGED, () => {
      providerInstances.forEach((p) => p.onSessionStateChanged());
    });

    providerInstances.forEach((p) => p.init());
  }
});

export class GoogleCastProvider {
  readonly media: CastableMediaElement;
  seeking = false;

  #hooks: Partial<GoogleCastProviderHooks> = {};
  #isInit = false;
  #local: LocalPlayer;
  #remote!: cast.framework.RemotePlayer;
  #remoteListeners!: Record<string, RemotePlayerListener>;
  #listenersAttached = false;
  #playbackRate = 1;
  #localPaused = false;
  #onTextTrackChange = () => this.#updateRemoteTextTrack();
  #onMediaUpdate = () => this.#checkPlaybackRate();

  constructor(media: CastableMediaElement, local: LocalPlayer) {
    this.media = media;
    this.#local = local;
    providerInstances.add(this);
    this.init();
  }

  bindHooks(hooks: Partial<GoogleCastProviderHooks>) {
    Object.assign(this.#hooks, hooks);
  }

  get isCasting() {
    return castElementRef.has(this.media);
  }

  set isCasting(value: boolean) {
    if (value) castElementRef.add(this.media);
    else castElementRef.delete(this.media);
  }

  hasDevicesAvailable() {
    const state = castContext()?.getCastState();
    return !!state && state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
  }

  async requestCastSession() {
    if (!this.#isCastApiAvailable()) {
      throw new NotSupportedError('The RemotePlayback API is disabled on this platform.');
    }

    const willDisconnect = this.isCasting;
    this.isCasting = true;

    this.#applyCastOptions();
    this.#attachRemoteListeners();

    try {
      await castContext()!.requestSession();
    } catch (err) {
      if (!willDisconnect) {
        this.isCasting = false;
      }

      if (err === 'cancel') {
        return;
      }

      throw new Error(err as string);
    }

    this.#localPaused = this.#local.paused();
    this.#local.pause();
    this.muted = this.#local.muted();

    try {
      await this.load();
    } catch (err) {
      console.error(err);
    }
  }

  async load() {
    const mediaInfo = new chrome.cast.media.MediaInfo(this.media.castSrc, this.media.castContentType ?? '');
    mediaInfo.customData = (this.media.castCustomData as object) ?? null;

    const subtitles = [...this.media.querySelectorAll('track')].filter(
      (el) => el.src && (el.kind === 'subtitles' || el.kind === 'captions')
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
      this.media.castStreamType === 'live' ? chrome.cast.media.StreamType.LIVE : chrome.cast.media.StreamType.BUFFERED;

    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = this.media.title;
    mediaInfo.metadata.images = [new chrome.cast.Image(this.media.poster)];

    if (await isHls(this.media.castSrc)) {
      mediaInfo.contentType ||= 'application/x-mpegURL';

      const fmt = (await getPlaylistSegmentFormat(this.media.castSrc)) ?? '';
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
    request.currentTime = this.#local.currentTime();
    request.autoplay = !this.#localPaused;
    request.activeTrackIds = activeTrackIds;

    await currentSession()?.loadMedia(request);

    this.media.dispatchEvent(new Event('volumechange'));
  }

  // -- Native media surface (called by the mixin while isCasting is true) --

  async play() {
    // When a casted media ends, the media is unloaded and the player state is IDLE.
    if (!this.#remote.isMediaLoaded) {
      this.#localPaused = false;
      await this.load();
      return;
    }
    if (this.paused) {
      this.#remote.controller?.playOrPause();
      return new Promise<void>((resolve) => {
        this.media.addEventListener('play', () => resolve(), { once: true });
      });
    }
  }

  pause() {
    if (!this.paused) {
      this.#remote.controller?.playOrPause();
    }
  }

  // isPaused is not true when the media has ended so add the ended check.
  get paused() {
    return this.#remote.isPaused || this.ended;
  }

  get ended() {
    return (
      this.#remote.playerState === chrome.cast.media.PlayerState.IDLE &&
      currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED
    );
  }

  get muted() {
    return this.#remote.isMuted;
  }

  set muted(value: boolean) {
    if (value !== this.#remote.isMuted) {
      this.#remote.controller?.muteOrUnmute();
    }
  }

  get volume() {
    return this.#remote.volumeLevel ?? 1;
  }

  set volume(value: number) {
    this.#remote.volumeLevel = +value;
    this.#remote.controller?.setVolumeLevel();
  }

  get playbackRate() {
    return currentMedia()?.playbackRate ?? 1;
  }

  set playbackRate(value: number) {
    setPlaybackRate(value);
  }

  get duration() {
    if (this.#remote?.isMediaLoaded) return this.#remote.duration ?? NaN;
    return this.#local.duration();
  }

  get currentTime() {
    if (this.#remote?.isMediaLoaded) return this.#remote.currentTime ?? 0;
    return this.#local.currentTime();
  }

  set currentTime(value: number) {
    this.#remote.currentTime = value;
    this.#notifySeeking();
    this.#remote.controller?.seek();
  }

  get readyState() {
    switch (this.#remote.playerState) {
      case chrome.cast.media.PlayerState.IDLE:
        return 0;
      case chrome.cast.media.PlayerState.BUFFERING:
        return 2;
      default:
        return 3;
    }
  }

  init() {
    if (!cf || this.#isInit) return;
    this.#isInit = true;

    this.#applyCastOptions();

    this.media.textTracks.addEventListener('change', this.#onTextTrackChange);

    this.onCastStateChanged();

    this.#remote = new cf.RemotePlayer();
    new cf.RemotePlayerController(this.#remote);

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
        this.media.dispatchEvent(new Event('durationchange'));
      },
      [cf.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]: () => {
        this.media.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.IS_MUTED_CHANGED]: () => {
        this.media.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.CURRENT_TIME_CHANGED]: () => {
        if (!this.isCasting || !this.#remote.isMediaLoaded) return;
        this.#notifySeeked();
        this.media.dispatchEvent(new Event('timeupdate'));
      },
      [cf.RemotePlayerEventType.VIDEO_INFO_CHANGED]: () => {
        this.media.dispatchEvent(new Event('resize'));
      },
      [cf.RemotePlayerEventType.IS_PAUSED_CHANGED]: () => {
        this.media.dispatchEvent(new Event(this.isCasting && this.#remote.isPaused ? 'pause' : 'play'));
      },
      [cf.RemotePlayerEventType.PLAYER_STATE_CHANGED]: () => {
        const PS = chrome.cast.media.PlayerState;
        const state = this.isCasting ? this.#remote.playerState : undefined;

        if (state !== PS.BUFFERING) this.#notifySeeked();
        if (state === PS.PAUSED) return;

        if (state === PS.IDLE) {
          const finished = currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED;
          this.media.dispatchEvent(new Event(finished ? 'ended' : 'emptied'));
          return;
        }

        if (state === PS.PLAYING) this.media.dispatchEvent(new Event('playing'));
        else if (state === PS.BUFFERING) this.media.dispatchEvent(new Event('waiting'));
      },
      [cf.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]: async () => {
        if (!this.isCasting || !this.#remote.isMediaLoaded) return;

        await Promise.resolve();
        this.#onRemoteMediaLoaded();
      },
    };
  }

  onCastStateChanged() {
    if (!this.#isInit) return;
    const CS = cast.framework.CastState;
    const state = castContext()!.getCastState();

    if (this.isCasting && state === CS.CONNECTING) {
      this.#hooks.setState?.('connecting');
    }

    this.#hooks.setAvailable?.(!!state && state !== CS.NO_DEVICES_AVAILABLE);
  }

  async onSessionStateChanged() {
    if (!this.#isInit) return;
    const { SESSION_RESUMED } = cf!.SessionState;
    if (castContext()!.getSessionState() === SESSION_RESUMED) {
      if (this.media.castSrc === currentMedia()?.media?.contentId) {
        castElementRef.add(this.media);

        this.#attachRemoteListeners();

        try {
          await getMediaStatus(new chrome.cast.media.GetStatusRequest());
        } catch (error) {
          console.error(error);
        }

        this.#remoteListeners[cf!.RemotePlayerEventType.IS_PAUSED_CHANGED]!();
        this.#remoteListeners[cf!.RemotePlayerEventType.PLAYER_STATE_CHANGED]!();
        this.media.dispatchEvent(new Event('ratechange'));

        // TODO: sync remote enabled text track state to local text tracks
      }
    }
  }

  destroy() {
    providerInstances.delete(this);
    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.media.textTracks?.removeEventListener('change', this.#onTextTrackChange);
    this.#detachRemoteListeners();
    this.isCasting = false;
    this.#isInit = false;
  }

  #isCastApiAvailable() {
    return Boolean(globalThis.chrome?.cast?.isAvailable);
  }

  #applyCastOptions() {
    setCastOptions(this.media.castOptions);
  }

  // CAF's RemotePlayerController does not deduplicate handlers, so we guard
  // attach/detach with a flag to prevent duplicate event dispatches across
  // cancel/retry and stop-casting flows.
  #attachRemoteListeners() {
    if (this.#listenersAttached) return;
    const controller = this.#remote?.controller;
    if (!controller) return;

    for (const [type, handler] of Object.entries(this.#remoteListeners)) {
      controller.addEventListener(type as cast.framework.RemotePlayerEventType, handler);
    }
    this.#listenersAttached = true;
  }

  #detachRemoteListeners() {
    if (!this.#listenersAttached) return;
    const controller = this.#remote?.controller;

    if (controller) {
      for (const [type, handler] of Object.entries(this.#remoteListeners)) {
        controller.removeEventListener(type as cast.framework.RemotePlayerEventType, handler);
      }
    }
    this.#listenersAttached = false;
  }

  #disconnect() {
    if (!this.isCasting) return;

    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.#detachRemoteListeners();
    this.seeking = false;
    this.#playbackRate = 1;
    this.isCasting = false;

    this.media.muted = this.#remote.isMuted;
    const saved = this.#remote.savedPlayerState;
    if (saved) {
      this.media.currentTime = saved.currentTime;
      if (saved.isPaused === false) this.media.play();
    }
  }

  #notifySeeking() {
    this.seeking = true;
    this.media.dispatchEvent(new Event('seeking'));
  }

  #notifySeeked() {
    if (!this.seeking) return;
    this.seeking = false;
    this.media.dispatchEvent(new Event('seeked'));
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
      this.media.dispatchEvent(new Event('ratechange'));
    }
  }

  async #updateRemoteTextTrack() {
    if (!this.isCasting) return;

    const localSubs = [...this.media.textTracks].filter(({ kind }) => kind === 'subtitles' || kind === 'captions');

    const matched = (this.#remote.mediaInfo?.tracks ?? [])
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
