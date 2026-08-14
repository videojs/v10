// Minimal typings and loader for the Spotify iframe API
// (https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api).
// The API arrives from a script tag, so there is no npm SDK to type against.

import { loadScript } from '@videojs/utils/dom';

/** Everything the embed reports about playback, with times in milliseconds. */
export interface SpotifyPlaybackState {
  isPaused: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
}

export interface SpotifyPlaybackUpdateEvent {
  data: SpotifyPlaybackState;
}

export interface SpotifyControllerApi {
  /**
   * The iframe the controller drives. `createController` never drives the element
   * it is handed: it builds this one from its own attributes and replaces the
   * target with it, so this is the embed from then on.
   */
  iframeElement: HTMLIFrameElement;
  /** Swap the embedded entity, named as a `spotify:<type>:<id>` URI. */
  loadUri(uri: string): void;
  /** Play from the start of the entity. */
  play(): void;
  /** Play from where the entity was paused. */
  resume(): void;
  pause(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(type: 'ready', listener: () => void): void;
  addListener(type: 'playback_update', listener: (event: SpotifyPlaybackUpdateEvent) => void): void;
}

/** Options `createController` accepts; Spotify's own keys pass through untouched. */
export interface SpotifyControllerOptions extends Record<string, unknown> {
  uri?: string;
  width?: string | number;
  height?: string | number;
}

export interface SpotifyIframeApi {
  /**
   * Build a controller. `target` is replaced by an iframe the controller builds
   * for itself, so Spotify's own examples hand over a placeholder `<div>` rather
   * than the embed.
   */
  createController(
    target: HTMLElement,
    options: SpotifyControllerOptions,
    callback: (controller: SpotifyControllerApi) => void
  ): void;
}

// The URL Spotify's own tutorial tells pages to load. `spotify-audio-element`
// still points at the older `embed-podcast` path, which serves the same loader.
const API_URL = 'https://open.spotify.com/embed/iframe-api/v1';

interface SpotifyApiGlobals {
  SpotifyIframeApi?: SpotifyIframeApi;
  onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
}

let apiPromise: Promise<SpotifyIframeApi> | null = null;

/** Load the iframe API once, reusing it if another host already pulled it in. */
export function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  const globals = globalThis as SpotifyApiGlobals;
  const existing = globals.SpotifyIframeApi;
  if (existing) return Promise.resolve(existing);

  apiPromise ??= new Promise<SpotifyIframeApi>((resolve, reject) => {
    // The script hands the API to this global as it evaluates and exposes it no
    // other way, so the callback has to be in place before the tag is added.
    // A page that followed Spotify's own instructions has its callback there
    // already, and the loader fires the global once and only once — a second
    // script tag reports the API as initialized and does nothing — so taking the
    // global over means passing the API on to whoever had it.
    const hostReady = globals.onSpotifyIframeApiReady;
    globals.onSpotifyIframeApiReady = (api) => {
      // Resolve first: a host callback that throws must not strand this load.
      resolve(api);
      hostReady?.(api);
    };
    loadScript(API_URL).catch(reject);
  }).catch((error: unknown) => {
    // A failed load must not be the answer forever; drop it so the next host to
    // ask can try again.
    apiPromise = null;
    throw error;
  });

  return apiPromise;
}
