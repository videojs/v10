import { isAbortError, isPlainObject, isString } from '@videojs/utils/predicate';

import { createMuxQuery, MUX_VIDEO_DOMAIN, type MuxContentData, type MuxSourceBase } from './source';

/**
 * The metadata Mux publishes for an asset, flattened to one value per key: `title` from the document's title list, and
 * every `{ key, value }` entry under its own key — Mux Data's names (`video_title`, …) and Mux's reverse-DNS ones such
 * as `com.mux.video.branding`.
 */
export type MuxMetadata = Readonly<Record<string, string>>;

/**
 * Build the metadata URL for a source. Every Mux asset has a document there, titled or not, and signed playback carries
 * its `playback.token` along — the document sits under the playback ID like every other URL the token covers, and
 * answers `403` without it.
 */
export function createMuxMetadataURL(source?: MuxSourceBase | null): string | undefined {
  if (!source?.playbackId) return undefined;

  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, playback } = source;

  return `https://stream.${customDomain}/${playbackId}/metadata.json${createMuxQuery({ token: playback?.token })}`;
}

/**
 * Flatten the metadata document to one value per key.
 *
 * The document is Apple's JSON chapters format: a list of chapters, the first of which stands for the asset. Its
 * `titles` carry the asset title (`[{ language, title }]`, the first being the default), and its `metadata` carries `{
 * key, value }` entries. An asset without metadata still has a document, just without either, so anything unexpected
 * flattens to an empty object rather than failing.
 */
export function parseMuxMetadata(json: unknown): MuxMetadata {
  const metadata: Record<string, string> = {};

  const [first] = Array.isArray(json) ? json : [];
  if (!isPlainObject(first)) return metadata;

  const { titles, metadata: entries } = first;

  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (isPlainObject(entry) && isString(entry.key) && entry.key && isString(entry.value)) {
        metadata[entry.key] = entry.value;
      }
    }
  }

  const [defaultTitle] = Array.isArray(titles) ? titles : [];
  const title = isPlainObject(defaultTitle) ? defaultTitle.title : undefined;

  if (isString(title) && title) metadata.title = title;

  return metadata;
}

/**
 * Fetch and flatten the metadata document at `url`.
 *
 * Resolves `undefined` when there is nothing to apply: the request was aborted, or it failed. Metadata is optional and
 * playback never depends on it, so a failure is never fatal — a `404` says the document does not exist and stays quiet,
 * and any other failure is only announced in development.
 */
export async function loadMuxMetadata(url: string, signal?: AbortSignal): Promise<MuxMetadata | undefined> {
  try {
    const response = await fetch(url, signal ? { signal } : {});
    if (response.ok) return parseMuxMetadata(await response.json());

    if (__DEV__ && response.status !== 404) {
      console.warn(`[vjs-mux] Failed to load the Mux metadata at ${url}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (__DEV__ && !signal?.aborted && !isAbortError(error)) {
      console.warn(`[vjs-mux] Failed to load the Mux metadata at ${url}.`, error);
    }
  }

  return undefined;
}

/**
 * The content data a metadata document contributes: every key as it stands, so a consumer can read what the shared
 * vocabulary does not name, with a `video_title` entry standing in for `title` when the document names none.
 */
export function toMuxContentData(metadata?: MuxMetadata): MuxContentData {
  if (!metadata) return {};

  const title = metadata.title || metadata.video_title;

  return { ...metadata, ...(title && { title }) };
}

/**
 * The metadata document for one Mux source, across the request that fetches it.
 *
 * Keyed by the source's identity — playback ID, domain, and playback token — so a source assignment that keeps those
 * keeps the document (an image param changing, say), and one that moves them drops it along with any request in flight.
 * A Media owns one of these next to its `source`, and folds `metadata` into `contentData` when `onChange` says it
 * moved.
 */
export class MuxMetadataLoader {
  #key: string | undefined;
  #metadata: MuxMetadata | undefined;
  #request: AbortController | null = null;
  readonly #onChange: () => void;

  constructor(onChange: () => void) {
    this.#onChange = onChange;
  }

  /** The document for the current source, once it has arrived. */
  get metadata(): MuxMetadata | undefined {
    return this.#metadata;
  }

  /**
   * Re-key to `source`. A source with the same identity leaves everything alone; any other drops the document and
   * aborts a request in flight. Quiet either way — the owner rebuilds its `contentData` right after.
   */
  reset(source: MuxSourceBase | null | undefined): void {
    const key = createMuxMetadataURL(source);
    if (key === this.#key) return;

    this.#key = key;
    this.#abort();
    this.#metadata = undefined;
  }

  /**
   * Fetch the document for the current source. Ignored without a Mux source, and once the document is here or on its
   * way — so repeated loads of one source cost one request.
   */
  load(): void {
    if (!this.#key || this.#metadata || this.#request) return;

    const request = (this.#request = new AbortController());

    void loadMuxMetadata(this.#key, request.signal).then((metadata) => {
      if (request.signal.aborted) return;

      this.#request = null;
      // A failed request settles as an empty document, so the source is not
      // asked for again on the next load.
      this.#metadata = metadata ?? {};
      this.#onChange();
    });
  }

  destroy(): void {
    this.#abort();
  }

  #abort(): void {
    this.#request?.abort();
    this.#request = null;
  }
}
