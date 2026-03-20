import { SKINS } from '@app/constants';
import type { Skin } from '@app/types';
import { DEFAULT_AUDIO_SOURCE, SOURCES, type SourceId } from './sources';

const params = new URLSearchParams(window.location.search);

function readSkin(): Skin {
  const skin = params.get('skin');

  return skin && SKINS.includes(skin as Skin) ? (skin as Skin) : 'default';
}

function readSource(): SourceId {
  const source = params.get('source');

  return source && source in SOURCES ? (source as SourceId) : 'hls-1';
}

let currentSkin = readSkin();
let currentSource = readSource();

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
