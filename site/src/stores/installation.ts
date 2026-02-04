import { atom } from 'nanostores';

export type Renderer =
  | 'cloudflare'
  | 'dash'
  | 'hls'
  | 'html5-audio'
  | 'html5-video'
  | 'jwplayer'
  | 'mux'
  | 'shaka'
  | 'spotify'
  | 'vimeo'
  | 'wistia'
  | 'youtube';

export type Skin = 'default-video' | 'default-audio' | 'minimal';

export type UseCase = 'default-video' | 'default-audio' | 'background-video';

export const renderer = atom<Renderer>('html5-video');
export const skin = atom<Skin>('default-video');
export const useCase = atom<UseCase>('default-video');

/** Mux playback ID from successful upload (used by code generation) */
export const muxPlaybackId = atom<string | null>(null);
