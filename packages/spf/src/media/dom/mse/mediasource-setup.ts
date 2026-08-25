/**
 * MediaSource Setup
 *
 * Utilities for creating and configuring MediaSource/ManagedMediaSource for MSE (Media Source Extensions) playback.
 *
 * Global ManagedMediaSource types are defined in ./mediasource.d.ts
 */

/** Check if MediaSource API is supported. */
export function supportsMediaSource(): boolean {
  return typeof MediaSource !== 'undefined';
}

/**
 * Check if ManagedMediaSource API is supported. ManagedMediaSource is a newer Safari API with better lifecycle
 * management.
 */
export function supportsManagedMediaSource(): boolean {
  return typeof ManagedMediaSource !== 'undefined';
}

/** Options for creating a MediaSource. */
export interface CreateMediaSourceOptions {
  /** Prefer ManagedMediaSource when available (default: false for broader compatibility). */
  preferManaged?: boolean;
}

/**
 * Create a MediaSource or ManagedMediaSource instance.
 *
 * @example
 *   const mediaSource = createMediaSource();
 *   const mediaElement = document.querySelector('video');
 *   attachMediaSource(mediaSource, mediaElement);
 *
 * @param options - Creation options
 * @returns A MediaSource or ManagedMediaSource instance
 * @throws Error if no MediaSource API is available
 */
export function createMediaSource(options: CreateMediaSourceOptions = {}): MediaSource {
  const { preferManaged = false } = options;
  if (preferManaged && supportsManagedMediaSource()) return new ManagedMediaSource!();

  if (supportsMediaSource()) {
    return new MediaSource();
  }

  throw new Error('MediaSource API is not supported');
}

/** Options for `detach`. */
export interface DetachOptions {
  /**
   * Run the `load()` reset on the next microtask instead of synchronously.
   *
   * Required whenever another owner contributes sibling `<source>` children to the same element and drops them from a
   * signal effect: effects re-run on a microtask, so a synchronous reset would run resource selection while those
   * siblings are still in the DOM and commit the element to one of them. Canonical caller: `setupMediaSource`, whose
   * compositions may include `setupAirPlay`'s native-HLS fallback source.
   *
   * The ownership guard is evaluated when the reset actually fires, so a re-attach landing in the interim correctly
   * suppresses it.
   */
  deferReset?: boolean;
}

/** Result of attaching a MediaSource to a media element. */
export interface AttachMediaSourceResult {
  /** The object URL created for the MediaSource. */
  url: string;
  /** Detach the MediaSource and clean up resources. */
  detach: (options?: DetachOptions) => void;
}

/**
 * Attach a MediaSource to an HTMLMediaElement via the `src` attribute.
 *
 * The object URL on the `src` attribute is the industry-hardened MSE attach across the browser matrix, and works for
 * ManagedMediaSource too (`srcObject` buys nothing over it and forfeits the uniform URL lifecycle).
 *
 * @example
 *   const mediaSource = createMediaSource();
 *   const { detach } = attachMediaSource(mediaSource, videoElement);
 *   // Use mediaSource...
 *   // Later, to clean up:
 *   detach();
 *
 * @param mediaSource - The MediaSource to attach
 * @param mediaElement - The media element to attach to
 * @returns Object with URL and detach function
 */
export function attachMediaSource(mediaSource: MediaSource, mediaElement: HTMLMediaElement): AttachMediaSourceResult {
  // ManagedMediaSource requires disableRemotePlayback — without it Safari
  // will not fire sourceopen. (MMS-only: on other platforms the flag governs
  // the standard Remote Playback API and must be left alone.)
  if (supportsManagedMediaSource() && mediaSource instanceof ManagedMediaSource!) {
    mediaElement.disableRemotePlayback = true;
  }

  const url = URL.createObjectURL(mediaSource);

  mediaElement.src = url;

  const detach = ({ deferReset }: DetachOptions = {}): void => {
    mediaElement.removeAttribute('src');
    scheduleReset(mediaSource, mediaElement, url, deferReset);
    URL.revokeObjectURL(url);
  };

  return { url, detach };
}

/**
 * Attach a MediaSource as a `<source>` child element.
 *
 * The object URL rides a `<source type="video/mp4">` inserted as the element's FIRST child (any bare `src` attribute is
 * dropped; `load()` re-runs resource selection). Unlike `srcObject`/`src` — which commit the element to the MSE
 * resource and ignore every `<source>` child — this keeps sibling `<source>` alternatives part of resource selection,
 * so a composition can offer the element a natively-playable alternative next to MSE. Canonical consumer:
 * `setupAirPlay`'s native-HLS fallback source, wired through `setupMediaSource`'s `attachMediaSource` config
 * (https://webkit.org/blog/15036/how-to-use-media-source-extensions-with-airplay/).
 */
export function attachMediaSourceAsSourceElement(
  mediaSource: MediaSource,
  mediaElement: HTMLMediaElement
): AttachMediaSourceResult {
  // ManagedMediaSource requires disableRemotePlayback — without it Safari
  // will not fire sourceopen. (MMS-only: on other platforms the flag governs
  // the standard Remote Playback API and must be left alone.) Features that
  // need it false flip it once the source is open.
  if (supportsManagedMediaSource() && mediaSource instanceof ManagedMediaSource!) {
    mediaElement.disableRemotePlayback = true;
  }

  const url = URL.createObjectURL(mediaSource);
  const sourceEl = document.createElement('source');

  sourceEl.type = 'video/mp4';
  sourceEl.src = url;

  mediaElement.removeAttribute('src');
  mediaElement.prepend(sourceEl);
  mediaElement.load();

  const detach = ({ deferReset }: DetachOptions = {}): void => {
    sourceEl.remove();
    scheduleReset(mediaSource, mediaElement, url, deferReset);
    URL.revokeObjectURL(url);
  };

  return { url, detach };
}

/**
 * Detach's `load()` reset, applied only when tearing down an **unclosed** attachment the element is still committed to:
 *
 * - **Closed MediaSource**: skip. The attachment is already dead, and the element deliberately keeps whatever playback
 *   state it carries for whatever attaches next — that attach's own `load()` performs the reset.
 * - **Element moved to another resource**: skip — resetting would rip that resource out from under its owner.
 */
function resetIfOwnedAndNotClosed(mediaSource: MediaSource, mediaElement: HTMLMediaElement, url: string): void {
  if (mediaSource.readyState !== 'closed' && mediaElement.currentSrc === url) {
    mediaElement.load();
  }
}

/**
 * Run the reset now, or on the next microtask when the caller has sibling `<source>` owners that clear on an effect
 * (see {@link DetachOptions.deferReset}).
 *
 * Deferring is safe because removing this attachment's own source does not by itself re-run resource selection: the
 * element stays committed to the object URL until something calls `load()`, so nothing starts playing in the gap.
 */
function scheduleReset(
  mediaSource: MediaSource,
  mediaElement: HTMLMediaElement,
  url: string,
  deferReset: boolean | undefined
): void {
  if (deferReset) {
    queueMicrotask(() => resetIfOwnedAndNotClosed(mediaSource, mediaElement, url));
    return;
  }

  resetIfOwnedAndNotClosed(mediaSource, mediaElement, url);
}

/**
 * Create a SourceBuffer on a MediaSource.
 *
 * @example
 *   const buffer = createSourceBuffer(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
 *
 * @param mediaSource - The MediaSource (must be in 'open' state)
 * @param mimeCodec - MIME type with codecs (e.g., 'video/mp4; codecs="avc1.42E01E"')
 * @returns The created SourceBuffer
 * @throws Error if MediaSource is not open or codec is unsupported
 */
export function createSourceBuffer(mediaSource: MediaSource, mimeCodec: string): SourceBuffer {
  if (mediaSource.readyState !== 'open') {
    throw new Error('MediaSource is not open');
  }

  if (!isCodecSupported(mimeCodec)) {
    throw new Error(`Codec not supported: ${mimeCodec}`);
  }

  return mediaSource.addSourceBuffer(mimeCodec);
}

/**
 * Build a MIME codec string from a track's `mimeType` + `codecs`. Works on partially-resolved tracks — both fields come
 * from the multivariant playlist and are available before media-playlist resolution.
 *
 * @example
 *   buildMimeCodec({ mimeType: 'video/mp4', codecs: ['avc1.42E01E'] });
 *   // => 'video/mp4; codecs="avc1.42E01E"'
 *
 * @param track - Track carrying `mimeType` and `codecs`
 * @returns MIME codec string suitable for `MediaSource.addSourceBuffer`
 */
export function buildMimeCodec(track: { mimeType: string; codecs?: string[] }): string {
  const codecString = track.codecs?.join(',') ?? '';

  return `${track.mimeType}; codecs="${codecString}"`;
}

/**
 * Check if a codec is supported.
 *
 * @example
 *   if (isCodecSupported('video/mp4; codecs="avc1.42E01E"')) {
 *     // Create source buffer
 *   }
 *
 * @param mimeCodec - MIME type with codecs string
 * @returns True if the codec is supported
 */
export function isCodecSupported(mimeCodec: string): boolean {
  if (!supportsMediaSource()) {
    return false;
  }

  return MediaSource.isTypeSupported(mimeCodec);
}

/**
 * Observe `mediaSource.readyState` changes via DOM events.
 *
 * Listens to `sourceopen`, `sourceended`, and `sourceclose` and invokes `onChange` with the current `readyState` after
 * each event. Listeners are automatically removed when `abortSignal` is aborted.
 *
 * @example
 *   const controller = new AbortController();
 *   onMediaSourceReadyStateChange(mediaSource, controller.signal, (state) => {
 *   if (state === 'open') { ... }
 *   });
 *   // Later: controller.abort();
 *
 * @param mediaSource - The MediaSource to observe
 * @param abortSignal - AbortSignal that controls listener lifetime
 * @param onChange - Called with the current readyState after each change
 */
export function onMediaSourceReadyStateChange(
  mediaSource: MediaSource,
  abortSignal: AbortSignal,
  onChange: (readyState: MediaSource['readyState']) => void
): void {
  const update = () => onChange(mediaSource.readyState);
  const options = { signal: abortSignal };

  mediaSource.addEventListener('sourceopen', update, options);
  mediaSource.addEventListener('sourceended', update, options);
  mediaSource.addEventListener('sourceclose', update, options);
}

/**
 * Wait until `mediaSource.readyState` transitions away from `'closed'` (the next
 * `sourceopen`/`sourceended`/`sourceclose` event), or until `signal` aborts — whichever fires first.
 *
 * Resolves immediately when `readyState` is already `'open'` or `'ended'` (no further transition is coming, so there's
 * nothing to wait for). The caller is expected to re-check `readyState` after the await to distinguish `'open'` from
 * terminal states.
 *
 * Companion to `onMediaSourceReadyStateChange` for one-shot use in async sequences (e.g., a behavior's reactor entry
 * that needs to wait for the MediaSource to attach before performing a spec-conforming mutation).
 *
 * @example
 *   await waitForMediaSourceOpen(mediaSource, signal);
 *   if (signal.aborted || mediaSource.readyState !== 'open') return;
 *   // safe to perform 'open'-state-only work
 */
export function waitForMediaSourceOpen(mediaSource: MediaSource, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();

  if (mediaSource.readyState !== 'closed') return Promise.resolve();

  return new Promise<void>((resolve) => {
    const done = () => resolve();
    const options = { once: true, signal };

    mediaSource.addEventListener('sourceopen', done, options);
    mediaSource.addEventListener('sourceended', done, options);
    mediaSource.addEventListener('sourceclose', done, options);
    signal.addEventListener('abort', done, { once: true });
  });
}
