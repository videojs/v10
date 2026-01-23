import { atom } from 'nanostores';

export type Renderer
  = | 'cloudflare'
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

export type Skin = 'frosted' | 'minimal';

export type UseCase = 'website' | 'background-video';

export const renderer = atom<Renderer>('html5-video');
export const skin = atom<Skin>('frosted');
export const useCase = atom<UseCase>('website');

/** Mux playback ID from successful upload (used by code generation) */
export const muxPlaybackId = atom<string | null>(null);
