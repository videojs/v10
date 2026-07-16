import { SOURCES, type SourceId } from './sources';

/**
 * Mux playback ID for a source, preferring the explicit `playbackId` field and
 * falling back to parsing it out of a `stream.mux.com` URL. Returns `undefined`
 * for non-Mux sources (e.g. DASH).
 */
export function getPlaybackId(source: SourceId): string | undefined {
  const entry = SOURCES[source] as { url: string; playbackId?: string };
  return entry.playbackId ?? entry.url.match(/stream\.mux\.com\/([a-zA-Z0-9]+)/)?.[1];
}

export function getMuxAssetId(source: SourceId): string | undefined {
  return getPlaybackId(source);
}
