import { findTrackElement, getTextTrackList, isCaptionOrSubtitleTrack, isEventTarget } from '@videojs/utils/dom';
import { NotSupportedError } from '@videojs/utils/errors';
import { isHlsSource } from '@videojs/utils/media';
import { defaults } from '@videojs/utils/object';
import { isObject, isString } from '@videojs/utils/predicate';
import type {
  MediaPauseCapability,
  MediaPlaybackRateCapability,
  MediaRemotePlaybackCapability,
  MediaRemotePlaybackTarget,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaVolumeCapability,
  RemotePlaybackLike,
  TextTrackListLike,
} from '../../../core/media/types';
import {
  isMediaPauseCapable,
  isMediaPlaybackCapable,
  isMediaSeekCapable,
  isMediaStreamTypeCapable,
  isMediaTextTrackCapable,
  isMediaVolumeCapable,
} from '../predicate';
import { RemotePlaybackBridge } from '../remote-playback';
import type { Media } from '../types';
import { getHTMLMediaElementTarget } from '../utils';
import { castFramework, ensureCastFramework, googleCastInstances } from './registry';
import { type GoogleCastProps, type GoogleCastRemotePlayerListener, googleCastDefaultProps } from './types';
import {
  type CastOptions,
  currentMedia,
  currentSession,
  editTracksInfo,
  getCastContext,
  getCastPlaylistSegmentFormat,
  getDefaultCastOptions,
  getMediaStatus,
  requiresCastFramework,
  setCastOptions,
  setCastPlaybackRate,
} from './utils';

export class GoogleCast
  extends EventTarget
  implements
    Media,
    MediaRemotePlaybackCapability,
    MediaRemotePlaybackTarget,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    GoogleCastProps
{
  #props: GoogleCastProps = { ...googleCastDefaultProps };

  #castOptions = getDefaultCastOptions();
  #customData: Record<string, unknown> | null | undefined;
  #src: string | undefined;
  #contentType: string | undefined;
  #streamType: string | undefined;

  #localMedia: Media | null = null;
  #remote: cast.framework.RemotePlayer | undefined;
  #remoteListeners: Record<string, GoogleCastRemotePlayerListener> = {};
  #remotePlayback = new RemotePlaybackBridge({
    disabled: () => this.#isRemotePlaybackDisabled(),
    prompt: () => this.requestCastSession(),
    availability: () => this.hasDevicesAvailable(),
  });

  #localPaused = false;
  #localMuted = false;
  #localDuration = Number.NaN;
  #localCurrentTime = 0;

  #isInit = false;
  #isCasting = false;
  #listenersAttached = false;
  #sessionRequesting = false;
  #playbackRate = 1;
  #isSeeking = false;
  #textTracks: TextTrackListLike | null = null;
  #onTextTrackChange = () => this.#updateRemoteTextTrack();
  #onMediaUpdate = () => this.#checkPlaybackRate();

  constructor(props?: Partial<GoogleCastProps>) {
    super();
    this.setProps(props);

    googleCastInstances.add(this);
    this.onCastFrameworkAvailable();
  }

  get remote(): RemotePlaybackLike {
    return this.#remotePlayback;
  }

  setProps(props: Partial<GoogleCastProps> | null | undefined) {
    this.#props = defaults(props ?? {}, googleCastDefaultProps);
    for (const prop of Object.keys(this.#props) as (keyof GoogleCastProps)[]) {
      (this as Record<keyof GoogleCastProps, unknown>)[prop] = this.#props[prop];
    }
  }

  setLocalMedia(media: Media | null): void {
    if (this.#localMedia === media) return;

    this.#detachTextTrackListener();
    this.#localMedia = media;
    this.#attachTextTrackListener();
  }

  get active() {
    return this.isCasting;
  }

  get supported() {
    return requiresCastFramework();
  }

  get isCasting() {
    return this.#isCasting;
  }

  hasDevicesAvailable() {
    const state = getCastContext()?.getCastState();
    if (state && castFramework) return state !== castFramework.CastState.NO_DEVICES_AVAILABLE;
    return this.supported && !this.#isRemotePlaybackDisabled() && !!this.src;
  }

  /** Resolved options passed to the Google Cast framework when it initializes. */
  get options(): CastOptions {
    return this.#castOptions;
  }

  /** Cast receiver application ID. Defaults to Google's default media receiver. */
  get receiver() {
    return this.#castOptions.receiverApplicationId;
  }

  set receiver(value: string | undefined) {
    const current = this.#castOptions.receiverApplicationId,
      next = value || getDefaultCastOptions().receiverApplicationId;

    if (current === next) return;

    this.#castOptions.receiverApplicationId = next;
    if (this.#isInit) this.#applyCastOptions();
  }

  /** Source URL loaded on the Cast receiver. */
  get src(): string {
    return this.#src ?? '';
  }

  set src(value: string | undefined) {
    const next = value || undefined;
    if (this.#src === next) return;
    this.#src = next;
    this.#remotePlayback.setAvailability(this.hasDevicesAvailable());
    if (this.isCasting) this.load();
  }

  get currentSrc(): string {
    return this.src;
  }

  /** MIME type of the Cast source. When unset, the receiver infers it from the URL. */
  get contentType() {
    return this.#contentType;
  }

  set contentType(value: string | undefined) {
    this.#contentType = value || undefined;
  }

  /** Stream type (`'on-demand'` or `'live'`) used on the Cast receiver. Falls back to `streamType`. */
  get streamType() {
    return this.#streamType ?? this.#localStreamType;
  }

  set streamType(value: string | undefined) {
    if (this.#streamType === value) return;
    this.#streamType = value;

    if (this.isCasting) this.load();
  }

  /** Custom data sent to the Cast receiver with the load request. */
  get customData() {
    return this.#customData;
  }

  set customData(value: Record<string, unknown> | null | undefined) {
    const valType = typeof value;
    if (!['object', 'undefined'].includes(valType)) {
      console.error(`customData must be nullish or an object but value was of type ${valType}`);
      return;
    }

    this.#customData = value;
  }

  async requestCastSession() {
    if (!this.src) {
      throw new NotSupportedError('No Google Cast source is available.');
    }

    if (!this.supported || this.#isRemotePlaybackDisabled()) {
      throw new NotSupportedError('The RemotePlayback API is disabled on this platform.');
    }

    await ensureCastFramework();

    if (!this.#isCastApiAvailable()) {
      throw new NotSupportedError('The RemotePlayback API is disabled on this platform.');
    }

    const willDisconnect = this.isCasting;
    this.#sessionRequesting = !willDisconnect;
    if (this.#sessionRequesting) this.#remotePlayback.setState('connecting');

    this.#applyCastOptions();
    this.#attachRemoteListeners();

    try {
      await getCastContext()!.requestSession();
    } catch (err) {
      if (!willDisconnect) {
        this.#isCasting = false;
        this.#remotePlayback.setState('disconnected');
      }
      this.#sessionRequesting = false;

      if (err === 'cancel') {
        return;
      }

      throw new Error(err as string);
    }

    this.#snapshotLocalMedia();
    if (isMediaPauseCapable(this.#localMedia)) this.#localMedia.pause();
    this.#sessionRequesting = false;
    this.#isCasting = true;
    this.muted = this.#localMuted;

    try {
      await this.load();
    } catch (err) {
      console.error(err);
    }
  }

  async load() {
    const src = this.src;

    if (!src) {
      // TODO: handle unloading the media?
      return;
    }

    const mediaInfo = new chrome.cast.media.MediaInfo(src, this.contentType ?? '');
    mediaInfo.customData = (this.customData as object) ?? null;

    const localMedia = this.#localMedia;
    const mediaElement = localMedia ? getHTMLMediaElementTarget(localMedia) : null;
    const subtitles = isMediaTextTrackCapable(localMedia)
      ? getTextTrackList(localMedia, isCaptionOrSubtitleTrack).flatMap((textTrack) => {
          const trackEl = mediaElement ? findTrackElement(mediaElement, textTrack) : null;
          const trackSrc = 'src' in textTrack && isString(textTrack.src) ? textTrack.src : trackEl?.src;
          return trackSrc ? [{ src: trackSrc, textTrack }] : [];
        })
      : [];

    const { Track, TrackType, TextTrackType } = chrome.cast.media;
    const activeTrackIds: number[] = [];

    if (subtitles.length) {
      mediaInfo.tracks = subtitles.map(({ src, textTrack }, i) => {
        const trackId = i + 1;
        if (!activeTrackIds.length && textTrack.mode === 'showing') activeTrackIds.push(trackId);

        const track = new Track(trackId, TrackType.TEXT);
        track.trackContentId = src;
        track.trackContentType = 'text/vtt';
        track.subtype = textTrack.kind === 'captions' ? TextTrackType.CAPTIONS : TextTrackType.SUBTITLES;
        track.name = textTrack.label;
        track.language = textTrack.language;
        return track;
      });
    }

    mediaInfo.streamType =
      this.streamType === 'live' ? chrome.cast.media.StreamType.LIVE : chrome.cast.media.StreamType.BUFFERED;

    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = this.#localTitle;
    mediaInfo.metadata.images = this.#localPoster ? [new chrome.cast.Image(this.#localPoster)] : [];

    if (await isHlsSource(src)) {
      mediaInfo.contentType ||= 'application/x-mpegURL';

      const fmt = (await getCastPlaylistSegmentFormat(src)) ?? '';
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
    request.currentTime = this.#localCurrentTime;
    request.autoplay = !this.#localPaused;
    request.activeTrackIds = activeTrackIds;

    await currentSession()?.loadMedia(request);

    this.#dispatchLocalEvent('volumechange');
  }

  // -- Native media surface (called by the mixin while isCasting is true) --

  async play() {
    // When a casted media ends, the media is unloaded and the player state is IDLE.
    if (!this.#remote?.isMediaLoaded) {
      this.#localPaused = false;
      await this.load();
      return;
    }
    if (this.paused) {
      this.#remote.controller?.playOrPause();
      return new Promise<void>((resolve) => {
        const media = this.#localMedia;

        if (!media) {
          resolve();
          return;
        }

        const onPlay = () => {
          media.removeEventListener('play', onPlay);
          resolve();
        };

        media.addEventListener('play', onPlay);
      });
    }
  }

  pause() {
    if (this.#remote && !this.paused) {
      this.#remote.controller?.playOrPause();
    }
  }

  // isPaused is not true when the media has ended so add the ended check.
  // Fall back to the local element before remote media has loaded — e.g.
  // while the cast picker is open, `isCasting` is already true but the
  // RemotePlayer's `isPaused` still reports its default `false`, which
  // would otherwise leak through as `media.paused === false`.
  get paused() {
    if (!this.#remote?.isMediaLoaded) return this.#localPaused;
    return this.#remote.isPaused || this.ended;
  }

  get ended() {
    if (!this.#remote) return false;
    return (
      this.#remote.playerState === chrome.cast.media.PlayerState.IDLE &&
      currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED
    );
  }

  get seeking() {
    return this.#isSeeking;
  }

  get muted() {
    return this.#remote?.isMuted ?? this.#localMuted;
  }

  set muted(value: boolean) {
    if (!this.#remote) {
      this.#localMuted = value;
      return;
    }

    if (value !== this.#remote.isMuted) {
      this.#remote.controller?.muteOrUnmute();
    }
  }

  get volume() {
    return this.#remote?.volumeLevel ?? 1;
  }

  set volume(value: number) {
    if (!this.#remote) return;
    this.#remote.volumeLevel = +value;
    this.#remote.controller?.setVolumeLevel();
  }

  get playbackRate() {
    return currentMedia()?.playbackRate ?? 1;
  }

  set playbackRate(value: number) {
    if (!this.#remote) return;
    setCastPlaybackRate(value);
  }

  get duration() {
    if (this.#remote?.isMediaLoaded) return this.#remote.duration ?? NaN;
    return this.#localDuration;
  }

  get currentTime() {
    if (this.#remote?.isMediaLoaded) return this.#remote.currentTime ?? 0;
    return this.#localCurrentTime;
  }

  set currentTime(value: number) {
    if (!this.#remote) {
      this.#localCurrentTime = value;
      return;
    }

    this.#remote.currentTime = value;
    this.#notifySeeking();
    this.#remote.controller?.seek();
  }

  get readyState() {
    if (!this.#remote) return 0;

    switch (this.#remote.playerState) {
      case chrome.cast.media.PlayerState.IDLE:
        return 0;
      case chrome.cast.media.PlayerState.BUFFERING:
        return 2;
      default:
        return 3;
    }
  }

  onCastFrameworkAvailable() {
    if (!castFramework || this.#isInit) return;

    this.#isInit = true;

    this.#applyCastOptions();

    this.#attachTextTrackListener();

    this.onCastStateChanged();

    this.#remote = new castFramework.RemotePlayer();
    new castFramework.RemotePlayerController(this.#remote);

    this.#remoteListeners = {
      [castFramework.RemotePlayerEventType.IS_CONNECTED_CHANGED]: (event?: cast.framework.RemotePlayerChangedEvent) => {
        const value = event?.value;
        if (value === true) {
          this.#remotePlayback.setState('connected');
        } else {
          this.#disconnect();
          this.#remotePlayback.setState('disconnected');
        }
      },
      [castFramework.RemotePlayerEventType.DURATION_CHANGED]: () => {
        this.#dispatchLocalEvent('durationchange');
      },
      [castFramework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]: () => {
        this.#dispatchLocalEvent('volumechange');
      },
      [castFramework.RemotePlayerEventType.IS_MUTED_CHANGED]: () => {
        this.#dispatchLocalEvent('volumechange');
      },
      [castFramework.RemotePlayerEventType.CURRENT_TIME_CHANGED]: () => {
        const remote = this.#remote;
        if (!this.isCasting || !remote?.isMediaLoaded) return;
        this.#notifySeeked();
        this.#dispatchLocalEvent('timeupdate');
      },
      [castFramework.RemotePlayerEventType.VIDEO_INFO_CHANGED]: () => {
        this.#dispatchLocalEvent('resize');
      },
      [castFramework.RemotePlayerEventType.IS_PAUSED_CHANGED]: () => {
        this.#dispatchLocalEvent(this.isCasting && this.#remote?.isPaused ? 'pause' : 'play');
      },
      [castFramework.RemotePlayerEventType.PLAYER_STATE_CHANGED]: () => {
        const remote = this.#remote;
        if (!remote) return;

        const PS = chrome.cast.media.PlayerState;
        const state = this.isCasting ? remote.playerState : undefined;

        if (state !== PS.BUFFERING) this.#notifySeeked();
        if (state === PS.PAUSED) return;

        if (state === PS.IDLE) {
          const finished = currentMedia()?.idleReason === chrome.cast.media.IdleReason.FINISHED;
          this.#dispatchLocalEvent(finished ? 'ended' : 'emptied');
          return;
        }

        if (state === PS.PLAYING) this.#dispatchLocalEvent('playing');
        else if (state === PS.BUFFERING) this.#dispatchLocalEvent('waiting');
      },
      [castFramework.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]: async () => {
        if (!this.isCasting || !this.#remote?.isMediaLoaded) return;

        await Promise.resolve();
        this.#onRemoteMediaLoaded();
      },
    };
  }

  onCastStateChanged() {
    if (!this.#isInit) return;
    const CS = castFramework?.CastState;
    if (!CS) return;

    const state = getCastContext()!.getCastState();

    if ((this.isCasting || this.#sessionRequesting) && state === CS.CONNECTING) {
      this.#remotePlayback.setState('connecting');
    }

    this.#remotePlayback.setAvailability(!!state && state !== CS.NO_DEVICES_AVAILABLE);
  }

  async onSessionStateChanged() {
    if (!this.#isInit) return;
    const { SESSION_RESUMED } = castFramework!.SessionState;
    if (getCastContext()!.getSessionState() === SESSION_RESUMED) {
      if (this.src === currentMedia()?.media?.contentId) {
        this.#isCasting = true;

        this.#attachRemoteListeners();

        try {
          await getMediaStatus(new chrome.cast.media.GetStatusRequest());
        } catch (error) {
          console.error(error);
        }

        this.#remoteListeners[castFramework!.RemotePlayerEventType.IS_PAUSED_CHANGED]!();
        this.#remoteListeners[castFramework!.RemotePlayerEventType.PLAYER_STATE_CHANGED]!();
        this.#dispatchLocalEvent('ratechange');

        // TODO: sync remote enabled text track state to local text tracks
      }
    }
  }

  destroy() {
    googleCastInstances.delete(this);
    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.setLocalMedia(null);
    this.#detachRemoteListeners();
    this.#isCasting = false;
    this.#isInit = false;
  }

  #isCastApiAvailable() {
    return Boolean(globalThis.chrome?.cast?.isAvailable);
  }

  #applyCastOptions() {
    setCastOptions(this.options);
  }

  get #localTitle(): string {
    const media = this.#localMedia;
    const title = isObject(media) ? (media as { title?: unknown }).title : undefined;
    return isString(title) ? title : '';
  }

  get #localPoster(): string {
    const media = this.#localMedia;
    const poster = isObject(media) ? (media as { poster?: unknown }).poster : undefined;
    return isString(poster) ? poster : '';
  }

  get #localStreamType(): string | undefined {
    return isMediaStreamTypeCapable(this.#localMedia) ? this.#localMedia.streamType : undefined;
  }

  #isRemotePlaybackDisabled(): boolean {
    const media = this.#localMedia;
    return isObject(media) && (media as { disableRemotePlayback?: unknown }).disableRemotePlayback === true;
  }

  #snapshotLocalMedia(): void {
    const media = this.#localMedia;

    this.#localPaused = isMediaPauseCapable(media) ? media.paused : true;
    this.#localMuted = isMediaVolumeCapable(media) ? media.muted : false;
    this.#localDuration = isMediaSeekCapable(media) ? media.duration : Number.NaN;
    this.#localCurrentTime = isMediaSeekCapable(media) ? media.currentTime : 0;
  }

  #dispatchLocalEvent(type: string): void {
    this.#localMedia?.dispatchEvent(new Event(type));
  }

  #attachTextTrackListener(): void {
    if (!this.#isInit || !isMediaTextTrackCapable(this.#localMedia)) return;

    const textTracks = this.#localMedia.textTracks;

    if (!isEventTarget(textTracks) || this.#textTracks === textTracks) return;

    this.#detachTextTrackListener();
    textTracks.addEventListener('change', this.#onTextTrackChange);
    this.#textTracks = textTracks;
  }

  #detachTextTrackListener(): void {
    if (!isEventTarget(this.#textTracks)) return;
    this.#textTracks.removeEventListener('change', this.#onTextTrackChange);
    this.#textTracks = null;
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
    if (!this.isCasting || !this.#remote) return;

    currentMedia()?.removeUpdateListener(this.#onMediaUpdate);
    this.#detachRemoteListeners();
    this.#isSeeking = false;
    this.#playbackRate = 1;
    this.#sessionRequesting = false;
    this.#isCasting = false;

    const localMedia = this.#localMedia;

    if (isMediaVolumeCapable(localMedia)) {
      localMedia.muted = this.#remote.isMuted;
    }

    const saved = this.#remote.savedPlayerState;
    if (saved && localMedia) {
      if (isMediaSeekCapable(localMedia)) localMedia.currentTime = saved.currentTime;
      if (saved.isPaused === false && isMediaPlaybackCapable(localMedia)) localMedia.play();
    }
  }

  #notifySeeking() {
    this.#isSeeking = true;
    this.#dispatchLocalEvent('seeking');
  }

  #notifySeeked() {
    if (!this.#isSeeking) return;
    this.#isSeeking = false;
    this.#dispatchLocalEvent('seeked');
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
      this.#dispatchLocalEvent('ratechange');
    }
  }

  async #updateRemoteTextTrack() {
    if (!this.isCasting || !this.#remote) return;

    const localSubs = isMediaTextTrackCapable(this.#localMedia)
      ? [...this.#localMedia.textTracks].filter(isCaptionOrSubtitleTrack)
      : [];

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

export namespace GoogleCast {
  export type Props = GoogleCastProps;
}
