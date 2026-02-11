import { atom } from 'nanostores';

export type Renderer =
  | 'background-video'
  | 'cloudflare'
  | 'dash'
  | 'hls'
  | 'html5-audio'
  | 'html5-video'
  | 'jwplayer'
  | 'mux-audio'
  | 'mux-background-video'
  | 'mux-video'
  // | 'shaka'
  | 'spotify'
  | 'vimeo'
  | 'wistia'
  | 'youtube';

export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio';

export type UseCase = 'default-video' | 'default-audio' | 'background-video';

export const renderer = atom<Renderer>('html5-video');
export const skin = atom<Skin>('video');
export const useCase = atom<UseCase>('default-video');

export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';

export const installMethod = atom<InstallMethod>('cdn');

/** Mux playback ID from successful upload (used by code generation) */
export const muxPlaybackId = atom<string | null>(null);
