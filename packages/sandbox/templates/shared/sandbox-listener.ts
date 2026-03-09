import type { Skin } from '../types';
import { createWebStorageStore } from '../utils/create-web-storage-store';
import { DEFAULT_AUDIO_SOURCE, SOURCES, type SourceId } from './sources';

const params = new URLSearchParams(window.location.search);

const skinStore = createWebStorageStore<Skin>('local', 'skin', 'default');
const sourceStore = createWebStorageStore<SourceId>('local', 'source', 'hls-1');

// Apply query param overrides to localStorage so they persist
const skinParam = params.get('skin') as Skin | null;
if (skinParam) skinStore.setValue(skinParam);

const sourceParam = params.get('source') as SourceId | null;
if (sourceParam) sourceStore.setValue(sourceParam);

export function getInitialSkin(): Skin {
  return skinStore.getSnapshot();
}

export function onSkinChange(callback: (skin: Skin) => void): () => void {
  const unsubStore = skinStore.subscribe(() => callback(skinStore.getSnapshot()));

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'skin-change' && event.data.skin !== skinStore.getSnapshot()) {
      skinStore.setValue(event.data.skin);
    }
  };

  window.addEventListener('message', handler);

  return () => {
    unsubStore();
    window.removeEventListener('message', handler);
  };
}

export function getInitialSource(audioOnly?: boolean): SourceId {
  const stored = sourceStore.getSnapshot();

  if (audioOnly && SOURCES[stored].type !== 'mp4') {
    return DEFAULT_AUDIO_SOURCE;
  }

  return stored;
}

export function onSourceChange(callback: (source: SourceId) => void): () => void {
  const unsubStore = sourceStore.subscribe(() => callback(sourceStore.getSnapshot()));

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'source-change' && event.data.source !== sourceStore.getSnapshot()) {
      sourceStore.setValue(event.data.source);
    }
  };

  window.addEventListener('message', handler);

  return () => {
    unsubStore();
    window.removeEventListener('message', handler);
  };
}
