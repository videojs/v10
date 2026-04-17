import type { RemotePlaybackState } from './remote-playback';
import type { CastableMediaElement } from './types';
import type { RemotePlayerListener } from './utils';
import {
  addRemoteListeners,
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
  removeRemoteListeners,
  setCastOptions,
  setPlaybackRate,
} from './utils';

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
    const castState = castContext()?.getCastState();
    return Boolean(castState && castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE);
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

    mediaInfo.streamType =
      this.media.castStreamType === 'live' ? chrome.cast.media.StreamType.LIVE : chrome.cast.media.StreamType.BUFFERED;

    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = this.media.title;
    mediaInfo.metadata.images = [new chrome.cast.Image(this.media.poster)];

    if (await isHls(this.media.castSrc)) {
      if (!mediaInfo.contentType) {
        mediaInfo.contentType = 'application/x-mpegURL';
      }

      const segmentFormat = await getPlaylistSegmentFormat(this.media.castSrc);
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
        const playerState = this.isCasting ? this.#remote.playerState : undefined;

        if (playerState !== chrome.cast.media.PlayerState.BUFFERING) {
          this.#notifySeeked();
        }

        if (playerState === chrome.cast.media.PlayerState.PAUSED) {
          return;
        }

        if (playerState === chrome.cast.media.PlayerState.IDLE) {
          const eventName = currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED ? 'ended' : 'emptied';
          this.media.dispatchEvent(new Event(eventName));
          return;
        }

        const eventName = (
          {
            [chrome.cast.media.PlayerState.PLAYING]: 'playing',
            [chrome.cast.media.PlayerState.BUFFERING]: 'waiting',
          } as Record<string, string>
        )[playerState ?? ''];

        if (eventName) {
          this.media.dispatchEvent(new Event(eventName));
        }
      },
      [cf.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]: async () => {
        if (!this.isCasting || !this.#remote.isMediaLoaded) return;

        await Promise.resolve();
        this.#onRemoteMediaLoaded();
      },
    };
  }

  onCastStateChanged() {
    const castState = castContext()!.getCastState();

    if (castElementRef.has(this.media)) {
      if (castState === cast.framework.CastState.CONNECTING) {
        this.#hooks.setState?.('connecting');
      }
    }

    const isConnectable =
      castState === cast.framework.CastState.NOT_CONNECTED ||
      castState === cast.framework.CastState.CONNECTING ||
      castState === cast.framework.CastState.CONNECTED;

    if (isConnectable) {
      this.#hooks.setAvailable?.(true);
    } else if (!castState || castState === cast.framework.CastState.NO_DEVICES_AVAILABLE) {
      this.#hooks.setAvailable?.(false);
    }
  }

  async onSessionStateChanged() {
    const { SESSION_RESUMED } = cf!.SessionState;
    if (castContext()!.getSessionState() === SESSION_RESUMED) {
      if (this.media.castSrc === currentMedia()?.media?.contentId) {
        castElementRef.add(this.media);

        addRemoteListeners(this.#remote.controller!, this.#remoteListeners);

        try {
          await getMediaStatus(new chrome.cast.media.GetStatusRequest());
        } catch (error) {
          console.error(error);
        }

        this.#remoteListeners[cf!.RemotePlayerEventType.IS_PAUSED_CHANGED]!();
        this.#remoteListeners[cf!.RemotePlayerEventType.PLAYER_STATE_CHANGED]!();
      }
    }
  }

  destroy() {
    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.media?.textTracks?.removeEventListener('change', this.#onTextTrackChange);

    if (this.#remoteListeners && this.#remote?.controller) {
      removeRemoteListeners(this.#remote.controller, this.#remoteListeners);
    }

    if (this.media) castElementRef.delete(this.media);
    this.#isInit = false;
  }

  #isCastApiAvailable() {
    return Boolean(globalThis.chrome?.cast?.isAvailable);
  }

  #applyCastOptions() {
    setCastOptions(this.media.castOptions);
  }

  #attachRemoteListeners() {
    addRemoteListeners(this.#remote.controller!, this.#remoteListeners);
  }

  #disconnect() {
    if (!castElementRef.has(this.media)) return;

    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    removeRemoteListeners(this.#remote.controller!, this.#remoteListeners);
    this.seeking = false;
    this.#playbackRate = 1;

    castElementRef.delete(this.media);

    this.media.muted = this.#remote.isMuted;
    const savedState = this.#remote.savedPlayerState;
    if (savedState) {
      this.media.currentTime = savedState.currentTime;
      if (savedState.isPaused === false) {
        this.media.play();
      }
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

    const remoteTracks = this.#remote.mediaInfo?.tracks ?? [];
    const remoteSubtitles = remoteTracks.filter(({ type }) => type === chrome.cast.media.TrackType.TEXT);

    const localSubtitles = [...this.media.textTracks].filter(({ kind }) => kind === 'subtitles' || kind === 'captions');

    const subtitles = remoteSubtitles
      .map(({ language, name, trackId }) => {
        const match = localSubtitles.find((local) => local.language === language && local.label === name);
        if (match?.mode) return { mode: match.mode, trackId };
        return null;
      })
      .filter((s): s is { mode: TextTrackMode; trackId: number } => s !== null);

    const hiddenSubtitles = subtitles.filter((s) => s.mode !== 'showing');
    const hiddenTrackIds = hiddenSubtitles.map((s) => s.trackId);
    const showingSubtitle = subtitles.find((s) => s.mode === 'showing');

    const activeTrackIds = currentSession()?.getSessionObj().media[0]?.activeTrackIds ?? [];
    let requestTrackIds = [...activeTrackIds];

    if (activeTrackIds.length) {
      requestTrackIds = requestTrackIds.filter((id) => !hiddenTrackIds.includes(id));
    }

    if (showingSubtitle?.trackId) {
      requestTrackIds = [...requestTrackIds, showingSubtitle.trackId];
    }

    requestTrackIds = [...new Set(requestTrackIds)];

    const arrayEquals = (a: number[], b: number[]) => a.length === b.length && a.every((v) => b.includes(v));
    if (!arrayEquals(activeTrackIds, requestTrackIds)) {
      try {
        const request = new chrome.cast.media.EditTracksInfoRequest(requestTrackIds);
        await editTracksInfo(request);
      } catch (error) {
        console.error(error);
      }
    }
  }
}
