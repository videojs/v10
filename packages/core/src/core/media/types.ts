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

export interface MediaPlaybackEvents {
  play: EventLike;
  playing: EventLike;
  waiting: EventLike;
}

export interface MediaPlaybackCapability {
  play(): Promise<void>;
}

export interface MediaPauseEvents {
  pause: EventLike;
  ended: EventLike;
}

export interface MediaPauseCapability {
  pause(): void;
  readonly paused: boolean;
  readonly ended: boolean;
}

export interface MediaSeekEvents {
  timeupdate: EventLike;
  durationchange: EventLike;
  seeking: EventLike;
  seeked: EventLike;
  loadedmetadata: EventLike;
}

export interface MediaSeekCapability {
  currentTime: number;
  readonly duration: number;
  readonly seeking: boolean;
}

export interface MediaSourceEvents {
  loadstart: EventLike;
  emptied: EventLike;
  canplay: EventLike;
  canplaythrough: EventLike;
  loadeddata: EventLike;
}

export interface MediaSourceCapability {
  src: string;
  readonly currentSrc: string;
  readonly readyState: MediaReadyStateValue | number;
  load(): void;
}

const MediaReadyState = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const;

export type MediaReadyStateValue = (typeof MediaReadyState)[keyof typeof MediaReadyState];

export type MediaFeatureAvailability = 'available' | 'unavailable' | 'unsupported';

export interface MediaVolumeEvents {
  volumechange: EventLike;
}

export interface MediaVolumeCapability {
  volume: number;
  muted: boolean;
}

export interface MediaPlaybackRateEvents {
  ratechange: EventLike;
}

export interface MediaPlaybackRateCapability {
  playbackRate: number;
}

export interface MediaBufferEvents {
  progress: EventLike;
}

export interface TimeRangeLike {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}

export interface MediaBufferCapability {
  readonly buffered: TimeRangeLike;
  readonly seekable: TimeRangeLike;
}

export interface MediaErrorEvents {
  error: EventLike;
}

export interface ErrorLike {
  readonly code: number;
  readonly message: string;
}

export interface MediaErrorCapability {
  readonly error: ErrorLike | null;
}

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
  changetrack: EventLike;
  trackmodechange: EventLike;
}

export interface TextTrackListLike {
  readonly length: number;
  readonly [index: number]: TextTrackLike;
  [Symbol.iterator](): Iterator<TextTrackLike>;
  getTrackById?(id: string): TextTrackLike | null;
}

export interface MediaTextTrackCapability {
  readonly textTracks: TextTrackListLike;
}

export interface MediaFullscreenCapability {
  requestFullscreen(): Promise<void>;
}

export interface MediaPictureInPictureCapability {
  requestPictureInPicture(): Promise<unknown>;
}

interface MediaEvents extends MediaPlaybackEvents {}

export interface Media extends MediaPlaybackCapability, EventTargetLike<MediaEvents> {
  readonly engine?: unknown;
  readonly target?: unknown;
}

export interface VideoEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents,
    TextTrackListEvents {}

export interface Video
  extends MediaPlaybackCapability,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaErrorCapability,
    MediaTextTrackCapability,
    MediaFullscreenCapability,
    MediaPictureInPictureCapability,
    EventTargetLike<VideoEvents> {
  readonly engine?: unknown;
  readonly target?: unknown;
}

export interface AudioEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents {}

export interface Audio
  extends MediaPlaybackCapability,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaErrorCapability,
    EventTargetLike<AudioEvents> {
  readonly engine?: unknown;
  readonly target?: unknown;
}

export interface MediaEngineHost<Engine = unknown, Target = unknown> {
  readonly engine: Engine | null;
  readonly target: Target | null;
  attach?(target: Target): void;
  detach?(): void;
  destroy(): void;
}
