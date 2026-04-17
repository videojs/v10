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
  IterableWeakSet,
  NotSupportedError,
  onCastApiAvailable,
  removeRemoteListeners,
  setCastOptions,
  setPlaybackRate,
} from './utils';

export type GoogleCastProviderHooks = {
  setState: (next: RemotePlaybackState) => void;
  setAvailable: (available: boolean) => void;
  loadOnPrompt: () => Promise<void>;
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
  #remotePlayer!: cast.framework.RemotePlayer;
  #remoteListeners!: Record<string, RemotePlayerListener>;
  #playbackRate = 1;
  #onTextTrackChange = () => this.#updateRemoteTextTrack();
  #onMediaUpdate = () => this.#checkPlaybackRate();

  constructor(media: CastableMediaElement, hooks: Partial<GoogleCastProviderHooks>) {
    this.media = media;
    this.bindHooks(hooks);
    providerInstances.add(this);
    this.init();
  }

  bindHooks(hooks: Partial<GoogleCastProviderHooks>): void {
    Object.assign(this.#hooks, hooks);
  }

  get isCasting(): boolean {
    return castElementRef.has(this.media);
  }

  set isCasting(value: boolean) {
    if (value) castElementRef.add(this.media);
    else castElementRef.delete(this.media);
  }

  hasDevicesAvailable(): boolean {
    const castState = castContext()?.getCastState();
    return Boolean(castState && castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE);
  }

  async requestCastSession(): Promise<void> {
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

    await this.#hooks.loadOnPrompt?.();
  }

  // -- Native media surface (called by the mixin while isCasting is true) --

  play(): void {
    if (this.paused) {
      this.#remotePlayer.controller?.playOrPause();
    }
  }

  pause(): void {
    if (!this.paused) {
      this.#remotePlayer.controller?.playOrPause();
    }
  }

  get paused(): boolean {
    return this.#remotePlayer.isPaused;
  }

  get muted(): boolean {
    return this.#remotePlayer.isMuted;
  }

  set muted(value: boolean) {
    if (value !== this.#remotePlayer.isMuted) {
      this.#remotePlayer.controller?.muteOrUnmute();
    }
  }

  get volume(): number {
    return this.#remotePlayer.volumeLevel ?? 1;
  }

  set volume(value: number) {
    this.#remotePlayer.volumeLevel = +value;
    this.#remotePlayer.controller?.setVolumeLevel();
  }

  get playbackRate(): number {
    return currentMedia()?.playbackRate ?? 1;
  }

  set playbackRate(value: number) {
    setPlaybackRate(value);
  }

  get duration(): number {
    if (this.#remotePlayer?.isMediaLoaded) return this.#remotePlayer.duration ?? NaN;
    return this.media.target?.duration ?? NaN;
  }

  get currentTime(): number {
    if (this.#remotePlayer?.isMediaLoaded) return this.#remotePlayer.currentTime ?? 0;
    return this.media.target?.currentTime ?? 0;
  }

  set currentTime(value: number) {
    this.#remotePlayer.currentTime = value;
    this.#notifySeeking();
    this.#remotePlayer.controller?.seek();
  }

  get readyState(): number {
    switch (this.#remotePlayer.playerState) {
      case chrome.cast.media.PlayerState.IDLE:
        return 0;
      case chrome.cast.media.PlayerState.BUFFERING:
        return 2;
      default:
        return 3;
    }
  }

  init(): void {
    if (!cf || this.#isInit) return;
    this.#isInit = true;

    this.#applyCastOptions();

    this.media.textTracks.addEventListener('change', this.#onTextTrackChange);

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
        this.media.dispatchEvent(new Event('durationchange'));
      },
      [cf.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]: () => {
        this.media.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.IS_MUTED_CHANGED]: () => {
        this.media.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.CURRENT_TIME_CHANGED]: () => {
        if (!this.isCasting || !this.#remotePlayer.isMediaLoaded) return;
        this.#notifySeeked();
        this.media.dispatchEvent(new Event('timeupdate'));
      },
      [cf.RemotePlayerEventType.VIDEO_INFO_CHANGED]: () => {
        this.media.dispatchEvent(new Event('resize'));
      },
      [cf.RemotePlayerEventType.IS_PAUSED_CHANGED]: () => {
        this.media.dispatchEvent(new Event(this.isCasting && this.#remotePlayer.isPaused ? 'pause' : 'play'));
      },
      [cf.RemotePlayerEventType.PLAYER_STATE_CHANGED]: () => {
        const playerState = this.isCasting ? this.#remotePlayer.playerState : undefined;

        if (playerState !== chrome.cast.media.PlayerState.BUFFERING) {
          this.#notifySeeked();
        }

        if (playerState === chrome.cast.media.PlayerState.PAUSED) {
          return;
        }

        const eventName = (
          {
            [chrome.cast.media.PlayerState.PLAYING]: 'playing',
            [chrome.cast.media.PlayerState.BUFFERING]: 'waiting',
            [chrome.cast.media.PlayerState.IDLE]: 'emptied',
          } as Record<string, string>
        )[playerState ?? ''];

        if (eventName) {
          this.media.dispatchEvent(new Event(eventName));
        }
      },
      [cf.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]: async () => {
        if (!this.isCasting || !this.#remotePlayer.isMediaLoaded) return;

        await Promise.resolve();
        this.#onRemoteMediaLoaded();
      },
    };
  }

  onCastStateChanged(): void {
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

  async onSessionStateChanged(): Promise<void> {
    const { SESSION_RESUMED } = cf!.SessionState;
    if (castContext()!.getSessionState() === SESSION_RESUMED) {
      if (this.media.castSrc === currentMedia()?.media?.contentId) {
        castElementRef.add(this.media);

        addRemoteListeners(this.#remotePlayer.controller!, this.#remoteListeners);

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

  destroy(): void {
    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.media?.textTracks?.removeEventListener('change', this.#onTextTrackChange);

    if (this.#remoteListeners && this.#remotePlayer?.controller) {
      removeRemoteListeners(this.#remotePlayer.controller, this.#remoteListeners);
    }

    if (this.media) castElementRef.delete(this.media);
    this.#isInit = false;
  }

  #isCastApiAvailable(): boolean {
    return Boolean(globalThis.chrome?.cast?.isAvailable);
  }

  #applyCastOptions(): void {
    setCastOptions(this.media.castOptions);
  }

  #attachRemoteListeners(): void {
    addRemoteListeners(this.#remotePlayer.controller!, this.#remoteListeners);
  }

  #disconnect(): void {
    if (!castElementRef.has(this.media)) return;

    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    removeRemoteListeners(this.#remotePlayer.controller!, this.#remoteListeners);
    this.seeking = false;
    this.#playbackRate = 1;

    castElementRef.delete(this.media);

    this.media.muted = this.#remotePlayer.isMuted;
    const savedState = this.#remotePlayer.savedPlayerState;
    if (savedState) {
      this.media.currentTime = savedState.currentTime;
      if (savedState.isPaused === false) {
        this.media.play();
      }
    }
  }

  #notifySeeking(): void {
    this.seeking = true;
    this.media.dispatchEvent(new Event('seeking'));
  }

  #notifySeeked(): void {
    if (!this.seeking) return;
    this.seeking = false;
    this.media.dispatchEvent(new Event('seeked'));
  }

  #onRemoteMediaLoaded(): void {
    this.#playbackRate = currentMedia()?.playbackRate ?? 1;
    currentMedia()?.addUpdateListener(this.#onMediaUpdate);
    this.#updateRemoteTextTrack();
  }

  #checkPlaybackRate(): void {
    const rate = currentMedia()?.playbackRate ?? 1;
    if (rate !== this.#playbackRate) {
      this.#playbackRate = rate;
      this.media.dispatchEvent(new Event('ratechange'));
    }
  }

  async #updateRemoteTextTrack(): Promise<void> {
    if (!this.isCasting) return;

    const remoteTracks = this.#remotePlayer.mediaInfo?.tracks ?? [];
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
