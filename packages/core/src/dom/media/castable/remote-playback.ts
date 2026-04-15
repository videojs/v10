import type { CastableMediaElement } from './types';
import {
  castContext,
  currentMedia,
  currentSession,
  editTracksInfo,
  getMediaStatus,
  InvalidStateError,
  IterableWeakSet,
  NotSupportedError,
  onCastApiAvailable,
  privateProps,
  setCastOptions,
} from './utils';

type AvailabilityCallback = (available: boolean) => void;
type RemotePlaybackState = 'disconnected' | 'connecting' | 'connected';
type RemotePlayerListener = (event?: cast.framework.RemotePlayerChangedEvent) => void;

function addRemoteListeners(
  controller: cast.framework.RemotePlayerController,
  listeners: Record<string, RemotePlayerListener>
): void {
  for (const [type, handler] of Object.entries(listeners)) {
    controller.addEventListener(type as cast.framework.RemotePlayerEventType, handler);
  }
}

function removeRemoteListeners(
  controller: cast.framework.RemotePlayerController,
  listeners: Record<string, RemotePlayerListener>
): void {
  for (const [type, handler] of Object.entries(listeners)) {
    controller.removeEventListener(type as cast.framework.RemotePlayerEventType, handler);
  }
}

const remoteInstances = new IterableWeakSet<RemotePlayback>();
const castElementRef = new WeakSet<CastableMediaElement>();

let cf: typeof cast.framework | undefined;

onCastApiAvailable(() => {
  if (!globalThis.chrome?.cast?.isAvailable) {
    console.debug('chrome.cast.isAvailable', globalThis.chrome?.cast?.isAvailable);
    return;
  }

  if (!cf) {
    cf = cast.framework;

    castContext()!.addEventListener(cf.CastContextEventType.CAST_STATE_CHANGED, (e) => {
      remoteInstances.forEach((r) => privateProps.get(r)?.onCastStateChanged?.(e));
    });

    castContext()!.addEventListener(cf.CastContextEventType.SESSION_STATE_CHANGED, (e) => {
      remoteInstances.forEach((r) => privateProps.get(r)?.onSessionStateChanged?.(e));
    });

    remoteInstances.forEach((r) => privateProps.get(r)?.init?.());
  }
});

let remotePlaybackCallbackIdCount = 0;

export class RemotePlayback extends EventTarget {
  #media: CastableMediaElement;
  #isInit = false;
  #remotePlayer!: cast.framework.RemotePlayer;
  #remoteListeners!: Record<string, (event?: cast.framework.RemotePlayerChangedEvent) => void>;
  #state: RemotePlaybackState = 'disconnected';
  #available = false;
  #seeking = false;
  #callbacks = new Set<AvailabilityCallback>();
  #callbackIds = new WeakMap<AvailabilityCallback, number>();
  #onTextTrackChange = () => this.#updateRemoteTextTrack();

  constructor(media: CastableMediaElement) {
    super();

    this.#media = media;

    remoteInstances.add(this);
    privateProps.set(this, {
      init: () => this.#init(),
      onCastStateChanged: () => this.#onCastStateChanged(),
      onSessionStateChanged: () => this.#onSessionStateChanged(),
      getCastPlayer: () => this.#castPlayer,
      isPaused: () => this.#paused,
      isSeeking: () => this.#isSeeking,
      notifySeeking: () => this.#notifySeeking(),
    });

    this.#init();
  }

  destroy(): void {
    this.#media?.textTracks?.removeEventListener('change', this.#onTextTrackChange);

    if (this.#remoteListeners && this.#remotePlayer?.controller) {
      removeRemoteListeners(this.#remotePlayer.controller, this.#remoteListeners);
    }

    if (this.#media) castElementRef.delete(this.#media);
    this.#isInit = false;
  }

  get #castPlayer(): cast.framework.RemotePlayer | undefined {
    if (castElementRef.has(this.#media)) return this.#remotePlayer;
    return undefined;
  }

  get state(): RemotePlaybackState {
    return this.#state;
  }

  async watchAvailability(callback: AvailabilityCallback): Promise<number> {
    if (this.#media.disableRemotePlayback) {
      throw new InvalidStateError('disableRemotePlayback attribute is present.');
    }

    this.#callbackIds.set(callback, ++remotePlaybackCallbackIdCount);
    this.#callbacks.add(callback);

    queueMicrotask(() => callback(this.#hasDevicesAvailable()));

    return remotePlaybackCallbackIdCount;
  }

  async cancelWatchAvailability(callback?: AvailabilityCallback): Promise<void> {
    if (this.#media.disableRemotePlayback) {
      throw new InvalidStateError('disableRemotePlayback attribute is present.');
    }

    if (callback) {
      this.#callbacks.delete(callback);
    } else {
      this.#callbacks.clear();
    }
  }

  async prompt(): Promise<void> {
    if (this.#media.disableRemotePlayback) {
      throw new InvalidStateError('disableRemotePlayback attribute is present.');
    }

    if (!globalThis.chrome?.cast?.isAvailable) {
      throw new NotSupportedError('The RemotePlayback API is disabled on this platform.');
    }

    const willDisconnect = castElementRef.has(this.#media);
    castElementRef.add(this.#media);

    setCastOptions(this.#media.castOptions);

    addRemoteListeners(this.#remotePlayer.controller!, this.#remoteListeners);

    try {
      await castContext()!.requestSession();
    } catch (err) {
      if (!willDisconnect) {
        castElementRef.delete(this.#media);
      }

      if (err === 'cancel') {
        return;
      }

      throw new Error(err as string);
    }

    privateProps.get(this.#media)?.loadOnPrompt?.();
  }

  #disconnect(): void {
    if (!castElementRef.has(this.#media)) return;

    removeRemoteListeners(this.#remotePlayer.controller!, this.#remoteListeners);
    this.#seeking = false;

    castElementRef.delete(this.#media);

    this.#media.muted = this.#remotePlayer.isMuted;
    const savedState = this.#remotePlayer.savedPlayerState;
    if (savedState) {
      this.#media.currentTime = savedState.currentTime;
      if (savedState.isPaused === false) {
        this.#media.play();
      }
    }
  }

  #hasDevicesAvailable(): boolean {
    const castState = castContext()?.getCastState();
    return Boolean(castState && castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE);
  }

  #onCastStateChanged(): void {
    const castState = castContext()!.getCastState();

    if (castElementRef.has(this.#media)) {
      if (castState === cast.framework.CastState.CONNECTING) {
        this.#state = 'connecting';
        this.dispatchEvent(new Event('connecting'));
      }
    }

    const isConnectable =
      castState === cast.framework.CastState.NOT_CONNECTED ||
      castState === cast.framework.CastState.CONNECTING ||
      castState === cast.framework.CastState.CONNECTED;

    if (!this.#available && isConnectable) {
      this.#available = true;
      for (const callback of this.#callbacks) callback(true);
    } else if (this.#available && (!castState || castState === cast.framework.CastState.NO_DEVICES_AVAILABLE)) {
      this.#available = false;
      for (const callback of this.#callbacks) callback(false);
    }
  }

  async #onSessionStateChanged(): Promise<void> {
    const { SESSION_RESUMED } = cf!.SessionState;
    if (castContext()!.getSessionState() === SESSION_RESUMED) {
      if (this.#media.castSrc === currentMedia()?.media?.contentId) {
        castElementRef.add(this.#media);

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

  #init(): void {
    if (!cf || this.#isInit) return;
    this.#isInit = true;

    setCastOptions(this.#media.castOptions);

    this.#media.textTracks.addEventListener('change', this.#onTextTrackChange);

    this.#onCastStateChanged();

    this.#remotePlayer = new cf.RemotePlayer();
    new cf.RemotePlayerController(this.#remotePlayer);

    this.#remoteListeners = {
      [cf.RemotePlayerEventType.IS_CONNECTED_CHANGED]: (event?: cast.framework.RemotePlayerChangedEvent) => {
        const value = event?.value;
        if (value === true) {
          this.#state = 'connected';
          this.dispatchEvent(new Event('connect'));
        } else {
          this.#disconnect();
          this.#state = 'disconnected';
          this.dispatchEvent(new Event('disconnect'));
        }
      },
      [cf.RemotePlayerEventType.DURATION_CHANGED]: () => {
        this.#media.dispatchEvent(new Event('durationchange'));
      },
      [cf.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]: () => {
        this.#media.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.IS_MUTED_CHANGED]: () => {
        this.#media.dispatchEvent(new Event('volumechange'));
      },
      [cf.RemotePlayerEventType.CURRENT_TIME_CHANGED]: () => {
        if (!this.#castPlayer?.isMediaLoaded) return;
        this.#notifySeeked();
        this.#media.dispatchEvent(new Event('timeupdate'));
      },
      [cf.RemotePlayerEventType.VIDEO_INFO_CHANGED]: () => {
        this.#media.dispatchEvent(new Event('resize'));
      },
      [cf.RemotePlayerEventType.IS_PAUSED_CHANGED]: () => {
        this.#media.dispatchEvent(new Event(this.#paused ? 'pause' : 'play'));
      },
      [cf.RemotePlayerEventType.PLAYER_STATE_CHANGED]: () => {
        const playerState = this.#castPlayer?.playerState;

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
          this.#media.dispatchEvent(new Event(eventName));
        }
      },
      [cf.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]: async () => {
        if (!this.#castPlayer?.isMediaLoaded) return;

        await Promise.resolve();
        this.#onRemoteMediaLoaded();
      },
    };
  }

  get #paused(): boolean {
    if (this.#castPlayer) return this.#castPlayer.isPaused;
    return true;
  }

  get #isSeeking(): boolean {
    return this.#seeking;
  }

  #notifySeeking(): void {
    this.#seeking = true;
    this.#media.dispatchEvent(new Event('seeking'));
  }

  #notifySeeked(): void {
    if (!this.#seeking) return;
    this.#seeking = false;
    this.#media.dispatchEvent(new Event('seeked'));
  }

  #onRemoteMediaLoaded(): void {
    this.#updateRemoteTextTrack();
  }

  async #updateRemoteTextTrack(): Promise<void> {
    if (!this.#castPlayer) return;

    const remoteTracks = this.#remotePlayer.mediaInfo?.tracks ?? [];
    const remoteSubtitles = remoteTracks.filter(({ type }) => type === chrome.cast.media.TrackType.TEXT);

    const localSubtitles = [...this.#media.textTracks].filter(
      ({ kind }) => kind === 'subtitles' || kind === 'captions'
    );

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
