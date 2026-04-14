import { atom } from 'nanostores';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';

export const renderer = atom<Renderer>('html5-video');
export const skin = atom<Skin>('video');
export const useCase = atom<UseCase>('default-video');
export const sourceUrl = atom<string>('');

export const installMethod = atom<InstallMethod>('cdn');

/** Mux playback ID from successful upload (used by code generation) */
export const muxPlaybackId = atom<string | null>(null);
