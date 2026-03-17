import type { Skin } from '@app/types';
import { skinStore, sourceStore } from '@app/utils/stores';
import { DEFAULT_AUDIO_SOURCE, SOURCES, type SourceId } from './sources';

export function getInitialSkin(): Skin {
  return skinStore.getSnapshot();
}

export function onSkinChange(callback: (skin: Skin) => void): () => void {
  return skinStore.subscribe(() => callback(skinStore.getSnapshot()));
}

export function getInitialSource(audioOnly?: boolean): SourceId {
  const stored = sourceStore.getSnapshot();

  if (audioOnly && SOURCES[stored].type !== 'mp4') {
    return DEFAULT_AUDIO_SOURCE;
  }

  return stored;
}

export function onSourceChange(callback: (source: SourceId) => void): () => void {
  return sourceStore.subscribe(() => callback(sourceStore.getSnapshot()));
}
