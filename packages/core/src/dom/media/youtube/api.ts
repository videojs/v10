// Minimal YouTube IFrame Player API types (runtime-loaded global — no npm package).

export interface YTCaptionTrack {
  languageCode: string;
  displayName: string;
}

export interface YTPlayerEvent {
  data: number;
  target: YTPlayer;
}

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getPlayerState(): number;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoLoadedFraction(): number;
  setOption(module: string, option: string, value: unknown): void;
  getOption(module: string, option: string): unknown;
  addEventListener(event: string, listener: (e: YTPlayerEvent) => void): void;
  destroy(): void;
}

export interface YTPlayerConfig {
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onError?: (e: YTPlayerEvent) => void;
  };
}

export interface YTNamespace {
  Player: new (element: HTMLIFrameElement, config: YTPlayerConfig) => YTPlayer;
  PlayerState: {
    readonly UNSTARTED: -1;
    readonly ENDED: 0;
    readonly PLAYING: 1;
    readonly PAUSED: 2;
    readonly BUFFERING: 3;
    readonly CUED: 5;
  };
}

const API_URL = 'https://www.youtube.com/iframe_api';
const API_GLOBAL = 'YT';
const API_GLOBAL_READY = 'onYouTubeIframeAPIReady';

// Module-level cache — one script load per page lifetime.
let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  const win = globalThis as unknown as Record<string, unknown>;

  if (win[API_GLOBAL]) {
    return (apiPromise ??= Promise.resolve(win[API_GLOBAL] as YTNamespace));
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    // Chain onto any existing ready callback (e.g. another player on the page).
    const prev = win[API_GLOBAL_READY] as (() => void) | undefined;
    win[API_GLOBAL_READY] = () => {
      prev?.();
      resolve(win[API_GLOBAL] as YTNamespace);
    };
    const script = document.createElement('script');
    script.src = API_URL;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('Failed to load YouTube IFrame API'));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

/** Reset the cached API promise — for use in tests only. */
export function resetYouTubeApiCache(): void {
  apiPromise = null;
}
