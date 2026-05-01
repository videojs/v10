import { SKINS } from '@app/constants';
import type { Skin } from '@app/types';
import { DEFAULT_AUDIO_SOURCE, SOURCES, type SourceId } from './sources';

export const PRELOAD_VALUES = ['none', 'metadata', 'auto'] as const;
export type PreloadValue = (typeof PRELOAD_VALUES)[number];
export const DEFAULT_PRELOAD: PreloadValue = 'metadata';

const params = new URLSearchParams(window.location.search);

function readSkin(): Skin {
  const skin = params.get('skin');

  return skin && SKINS.includes(skin as Skin) ? (skin as Skin) : 'default';
}

function readSource(): SourceId {
  const source = params.get('source');

  return source && source in SOURCES ? (source as SourceId) : 'hls-1';
}

function readBoolean(name: string): boolean {
  return params.get(name) === '1';
}

function readPreload(): PreloadValue {
  const value = params.get('preload');
  return PRELOAD_VALUES.includes(value as PreloadValue) ? (value as PreloadValue) : DEFAULT_PRELOAD;
}

let currentSkin = readSkin();
let currentSource = readSource();
let currentAutoplay = readBoolean('autoplay');
let currentMuted = readBoolean('muted');
let currentLoop = readBoolean('loop');
let currentPreload = readPreload();

export function getInitialSkin(): Skin {
  return currentSkin;
}

export function onSkinChange(callback: (skin: Skin) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'skin-change' || !SKINS.includes(event.data.skin)) return;

    currentSkin = event.data.skin;
    callback(currentSkin);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialSource(audioOnly?: boolean): SourceId {
  const stored = currentSource;

  if (audioOnly && SOURCES[stored].type !== 'mp4') {
    return DEFAULT_AUDIO_SOURCE;
  }

  return stored;
}

export function onSourceChange(callback: (source: SourceId) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'source-change' || !(event.data.source in SOURCES)) return;

    currentSource = event.data.source;
    callback(currentSource);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialAutoplay(): boolean {
  return currentAutoplay;
}

export function onAutoplayChange(callback: (autoplay: boolean) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'autoplay-change' || typeof event.data.autoplay !== 'boolean') return;

    currentAutoplay = event.data.autoplay;
    callback(currentAutoplay);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialMuted(): boolean {
  return currentMuted;
}

export function onMutedChange(callback: (muted: boolean) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'muted-change' || typeof event.data.muted !== 'boolean') return;

    currentMuted = event.data.muted;
    callback(currentMuted);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialLoop(): boolean {
  return currentLoop;
}

export function onLoopChange(callback: (loop: boolean) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'loop-change' || typeof event.data.loop !== 'boolean') return;

    currentLoop = event.data.loop;
    callback(currentLoop);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}

export function getInitialPreload(): PreloadValue {
  return currentPreload;
}

export function onPreloadChange(callback: (preload: PreloadValue) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'preload-change' || !PRELOAD_VALUES.includes(event.data.preload)) return;

    currentPreload = event.data.preload;
    callback(currentPreload);
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}
