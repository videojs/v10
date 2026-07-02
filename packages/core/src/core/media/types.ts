// ----------------------------------------
// Event primitives
// ----------------------------------------

export interface EventLike<Detail = void> {
  readonly type: string;
  readonly timeStamp: number;
  readonly detail?: Detail;
}

export interface EventTargetLike<Events extends { [K in keyof Events]: EventLike }> {
  addEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: { signal?: AbortSignal }
  ): void;
  removeEventListener<K extends keyof Events & string>(type: K, listener: (event: Events[K]) => void): void;
  dispatchEvent(event: EventLike): boolean;
}

export function TypedEventTarget<Events extends { [K in keyof Events]: EventLike }>() {
  return EventTarget as unknown as { new (): EventTargetLike<Events> };
}

// ----------------------------------------
// Shared value types
// ----------------------------------------

export type MediaFeatureAvailability = 'available' | 'unavailable' | 'unsupported';

// ----------------------------------------
// Controls
// ----------------------------------------

export interface MediaControlsCapability {
  controls: boolean;
}

// ----------------------------------------
// Playback
// ----------------------------------------

export interface MediaPlaybackEvents {
  play: EventLike;
  playing: EventLike;
  waiting: EventLike;
}

export interface MediaPlaybackCapability {
  play(): Promise<void>;
}

// ----------------------------------------
// Autoplay
// ----------------------------------------

export interface MediaAutoplayCapability {
  autoplay: boolean;
}

// ----------------------------------------
// Pause
// ----------------------------------------

export interface MediaPauseEvents {
  pause: EventLike;
  ended: EventLike;
}

export interface MediaPauseCapability {
  pause(): void;
  readonly paused: boolean;
  readonly ended: boolean;
}

// ----------------------------------------
// Seek
// ----------------------------------------

export interface MediaSeekEvents {
  timeupdate: EventLike;
  durationchange: EventLike;
  seeking: EventLike;
  seeked: EventLike;
  loadedmetadata: EventLike;
}

export interface MediaSeekCapability {
  currentTime: number;
  loop: boolean;
  readonly duration: number;
  readonly seeking: boolean;
}

// ----------------------------------------
// Source
// ----------------------------------------

export type MediaPreloadType = '' | 'none' | 'metadata' | 'auto';

const MediaReadyState = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const;

export type MediaReadyStateValue = (typeof MediaReadyState)[keyof typeof MediaReadyState];

export interface MediaSourceEvents {
  loadstart: EventLike;
  emptied: EventLike;
  canplay: EventLike;
  canplaythrough: EventLike;
  loadeddata: EventLike;
  abort: EventLike;
  stalled: EventLike;
  suspend: EventLike;
}

/** Result of {@link MediaSourceCapability.canPlayType}. */
export type CanPlayTypeResult = '' | 'maybe' | 'probably';

export interface MediaSourceCapability {
  src: string;
  readonly currentSrc: string;
  readonly readyState: MediaReadyStateValue | number;
  preload: MediaPreloadType;
  crossOrigin: string | null;
  load(): Promise<void> | void;
  canPlayType(type: string): CanPlayTypeResult;
}

// ----------------------------------------
// Volume
// ----------------------------------------

export interface MediaVolumeEvents {
  volumechange: EventLike;
}

export interface MediaVolumeCapability {
  volume: number;
  muted: boolean;
  defaultMuted: boolean;
}

// ----------------------------------------
// Playback rate
// ----------------------------------------

export interface MediaPlaybackRateEvents {
  ratechange: EventLike;
}

export interface MediaPlaybackRateCapability {
  playbackRate: number;
  defaultPlaybackRate: number;
}

// ----------------------------------------
// Buffer
// ----------------------------------------

export interface TimeRangeLike {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}

export interface MediaBufferEvents {
  progress: EventLike;
}

export interface MediaBufferCapability {
  readonly buffered: TimeRangeLike;
  readonly seekable: TimeRangeLike;
}

// ----------------------------------------
// Played
// ----------------------------------------

export interface MediaPlayedCapability {
  readonly played: TimeRangeLike;
}

// ----------------------------------------
// Error
// ----------------------------------------

export interface ErrorLike {
  readonly code: number;
  readonly message: string;
}

export interface MediaErrorEvents {
  error: EventLike;
}

export interface MediaErrorCapability {
  readonly error: ErrorLike | null;
}

// ----------------------------------------
// Text tracks
// ----------------------------------------

export interface TextCueLike {
  readonly startTime: number;
  readonly endTime: number;
  readonly text?: string;
}

export interface TextCueListLike {
  readonly length: number;
  [Symbol.iterator](): Iterator<TextCueLike>;
  getCueById?(id: string): TextCueLike | null;
}

/**
 * The kind of text track.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextTrack/kind
 */
export type TextTrackKind = 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';

export interface TextTrackLike {
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly id: string;
  readonly src?: string;
  mode: 'showing' | 'disabled' | 'hidden';
  readonly cues: TextCueListLike | null;
  addCue?(cue: TextCueLike): void;
}

export interface TextTrackListEvents {
  addtrack: EventLike;
  removetrack: EventLike;
  change: EventLike;
}

export interface TextTrackListLike extends EventTargetLike<TextTrackListEvents> {
  readonly length: number;
  readonly [index: number]: TextTrackLike;
  [Symbol.iterator](): Iterator<TextTrackLike>;
  getTrackById?(id: string): TextTrackLike | null;
}

export interface MediaTextTrackCapability {
  readonly textTracks: TextTrackListLike;
  addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrackLike;
}

// ----------------------------------------
// Media tracks
// ----------------------------------------

interface MediaTrackEventLike<Track> extends EventLike {
  readonly track: Track;
}

interface MediaTrackListEvents<Track> {
  addtrack: MediaTrackEventLike<Track>;
  removetrack: MediaTrackEventLike<Track>;
  change: EventLike;
}

export interface AudioTrackLike {
  id: string | undefined;
  readonly kind: string | undefined;
  readonly label: string;
  readonly language: string;
  enabled: boolean;
  addRendition(src: string, codec?: string | undefined, bitrate?: number | undefined): AudioRenditionLike;
  removeRendition(rendition: AudioRenditionLike): void;
}

export interface AudioTrackListLike extends EventTargetLike<MediaTrackListEvents<AudioTrackLike>> {
  readonly length: number;
  readonly [index: number]: AudioTrackLike;
  [Symbol.iterator](): Iterator<AudioTrackLike>;
  getTrackById(id: string): AudioTrackLike | null;
}

export interface VideoTrackLike {
  id: string | undefined;
  readonly kind: string | undefined;
  readonly label: string;
  readonly language: string;
  selected: boolean;
  addRendition(
    src: string,
    width?: number | undefined,
    height?: number | undefined,
    codec?: string | undefined,
    bitrate?: number | undefined,
    frameRate?: number | undefined
  ): VideoRenditionLike;
  removeRendition(rendition: VideoRenditionLike): void;
}

export interface VideoTrackListLike extends EventTargetLike<MediaTrackListEvents<VideoTrackLike>> {
  readonly length: number;
  readonly [index: number]: VideoTrackLike;
  [Symbol.iterator](): Iterator<VideoTrackLike>;
  getTrackById(id: string): VideoTrackLike | null;
  readonly selectedIndex: number;
}

export interface MediaAudioTrackCapability {
  readonly audioTracks: AudioTrackListLike;
  addAudioTrack(kind: string, label?: string, language?: string): AudioTrackLike;
  removeAudioTrack(track: AudioTrackLike): void;
}

export interface MediaVideoTrackCapability {
  readonly videoTracks: VideoTrackListLike;
  addVideoTrack(kind: string, label?: string, language?: string): VideoTrackLike;
  removeVideoTrack(track: VideoTrackLike): void;
}

// ----------------------------------------
// Renditions
// ----------------------------------------

interface RenditionEventLike<Rendition> extends EventLike {
  readonly rendition: Rendition;
}

interface RenditionListEvents<Rendition> {
  addrendition: RenditionEventLike<Rendition>;
  removerendition: RenditionEventLike<Rendition>;
  change: EventLike;
}

export interface AudioRenditionLike {
  id: string | undefined;
  readonly bitrate: number | undefined;
  readonly codec: string | undefined;
  selected: boolean;
}

export interface AudioRenditionListLike extends EventTargetLike<RenditionListEvents<AudioRenditionLike>> {
  readonly length: number;
  readonly [index: number]: AudioRenditionLike;
  [Symbol.iterator](): Iterator<AudioRenditionLike>;
  getRenditionById(id: string): AudioRenditionLike | null;
  selectedIndex: number;
}

export interface VideoRenditionLike {
  id: string | undefined;
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly bitrate: number | undefined;
  readonly frameRate: number | undefined;
  readonly codec: string | undefined;
  selected: boolean;
  active?: boolean | undefined;
}

interface VideoRenditionListEvents extends RenditionListEvents<VideoRenditionLike> {
  activechange: EventLike;
}

export interface VideoRenditionListLike extends EventTargetLike<VideoRenditionListEvents> {
  readonly length: number;
  readonly [index: number]: VideoRenditionLike;
  [Symbol.iterator](): Iterator<VideoRenditionLike>;
  getRenditionById(id: string): VideoRenditionLike | null;
  selectedIndex: number;
}

export interface MediaAudioRenditionCapability {
  readonly audioRenditions: AudioRenditionListLike;
}

export interface MediaVideoRenditionCapability {
  readonly videoRenditions: VideoRenditionListLike;
}

// ----------------------------------------
// Fullscreen
// ----------------------------------------

export interface MediaFullscreenCapability {
  readonly isFullscreen: boolean;
  requestFullscreen(): Promise<unknown>;
  exitFullscreen(): Promise<unknown>;
}

// ----------------------------------------
// Picture-in-picture
// ----------------------------------------

export interface MediaPictureInPictureEvents {
  enterpictureinpicture: EventLike;
  leavepictureinpicture: EventLike;
}

export interface MediaPictureInPictureCapability {
  readonly isPictureInPicture: boolean;
  disablePictureInPicture: boolean;
  requestPictureInPicture(): Promise<unknown>;
  exitPictureInPicture(): Promise<unknown>;
}

// ----------------------------------------
// Stream type
// ----------------------------------------

/**
 * Canonical values for {@link MediaStreamType}.
 *
 * - `ON_DEMAND` — a finite-duration asset (VOD). Scrubbing is generally
 *   supported across the full timeline.
 * - `LIVE` — a live or DVR stream. The seekable window may slide as new
 *   segments are published, and `duration` is typically `Infinity`.
 * - `UNKNOWN` — the stream type has not been determined yet (no source,
 *   or metadata has not loaded).
 */
export const MediaStreamTypes = {
  ON_DEMAND: 'on-demand',
  LIVE: 'live',
  UNKNOWN: 'unknown',
} as const;

export type MediaStreamType = (typeof MediaStreamTypes)[keyof typeof MediaStreamTypes];

export interface MediaStreamTypeEvents {
  streamtypechange: EventLike;
}

export interface MediaStreamTypeCapability {
  streamType: MediaStreamType;
}

export interface MediaLiveEvents {
  targetlivewindowchange: EventLike;
}

export interface MediaLiveCapability {
  /**
   * Presentation time marking the start of the Live Edge Window. Playing at
   * the live edge when `currentTime >= liveEdgeStart`. `NaN` when the stream
   * isn't live or the value is unknown.
   *
   * Derived — no dedicated change event; re-read when `seekable`,
   * `targetLiveWindow`, or `streamType` change.
   *
   * @see https://github.com/video-dev/media-ui-extensions/blob/main/proposals/0007-live-edge.md
   */
  readonly liveEdgeStart: number;
  /**
   * Offset representing the seekable range size for live content. `0` for
   * standard latency live, `Infinity` for DVR, `NaN` for on-demand or
   * unknown. Fires `targetlivewindowchange` when the value changes.
   */
  readonly targetLiveWindow: number;
}

// ----------------------------------------
// Remote playback
// ----------------------------------------

export interface RemotePlaybackEvents {
  connecting: EventLike;
  connect: EventLike;
  disconnect: EventLike;
}

export interface RemotePlaybackLike extends EventTargetLike<RemotePlaybackEvents> {
  readonly state: 'connecting' | 'connected' | 'disconnected';
  prompt(): Promise<void>;
  watchAvailability(callback: (available: boolean) => void): Promise<number>;
  cancelWatchAvailability(id?: number): Promise<void>;
}

export interface MediaRemotePlaybackCapability {
  readonly remote: RemotePlaybackLike;
  disableRemotePlayback: boolean;
}

// ----------------------------------------
// Plays inline (video-only)
// ----------------------------------------

export interface MediaPlaysInlineCapability {
  playsInline: boolean;
}

// ----------------------------------------
// Poster (video-only)
// ----------------------------------------

export interface MediaPosterCapability {
  poster: string;
}

// ----------------------------------------
// Video dimensions (video-only)
// ----------------------------------------

export interface MediaVideoDimensionsEvents {
  resize: EventLike;
}

export interface MediaVideoDimensionsCapability {
  readonly videoWidth: number;
  readonly videoHeight: number;
}

// ----------------------------------------
// Config
// ----------------------------------------

export interface MediaConfigCapability {
  config: Record<string, unknown>;
}

// ----------------------------------------
// Base Media
// ----------------------------------------

export interface MediaEvents extends MediaPlaybackEvents {}

export interface Media<Events extends { [K in keyof Events]: EventLike } = MediaEvents>
  extends MediaPlaybackCapability,
    EventTargetLike<Events> {}

// ----------------------------------------
// Composed shapes
// ----------------------------------------

export interface MediaFullEvents
  extends MediaEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents,
    TextTrackListEvents,
    MediaStreamTypeEvents,
    MediaLiveEvents {}

export interface MediaFull<Events extends { [K in keyof Events]: EventLike } = MediaFullEvents>
  extends Media<Events>,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaPlayedCapability,
    MediaErrorCapability,
    MediaTextTrackCapability,
    MediaStreamTypeCapability,
    MediaLiveCapability,
    MediaRemotePlaybackCapability,
    MediaControlsCapability,
    MediaAutoplayCapability,
    MediaConfigCapability {}

export interface VideoEvents extends MediaFullEvents, MediaPictureInPictureEvents, MediaVideoDimensionsEvents {}

export interface Video
  extends MediaFull<VideoEvents>,
    MediaPlaysInlineCapability,
    MediaPosterCapability,
    MediaFullscreenCapability,
    MediaPictureInPictureCapability,
    MediaVideoDimensionsCapability {}

export interface AudioEvents extends MediaFullEvents {}

export interface Audio extends MediaFull<AudioEvents> {}

// ----------------------------------------
// Target shapes
// ----------------------------------------

export interface MediaTargetLike
  extends MediaPlaybackCapability,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaPlayedCapability,
    MediaErrorCapability,
    MediaTextTrackCapability,
    MediaRemotePlaybackCapability,
    MediaControlsCapability,
    MediaAutoplayCapability,
    Partial<MediaLiveCapability>,
    Partial<MediaStreamTypeCapability>,
    Partial<MediaConfigCapability> {
  title: string;
}

export interface VideoTargetLike
  extends MediaTargetLike,
    MediaPosterCapability,
    MediaPlaysInlineCapability,
    MediaVideoDimensionsCapability {
  disablePictureInPicture: boolean;
  requestPictureInPicture(): Promise<unknown>;
  requestFullscreen(): Promise<unknown>;
}

export interface MediaEngineHost<Engine = unknown, Target = unknown> {
  readonly engine: Engine | null;
  attach?(target: Target): void;
  detach?(): void;
  destroy(): void;
}
