/**
 * MediaSource Setup
 *
 * Utilities for creating and configuring MediaSource/ManagedMediaSource
 * for MSE (Media Source Extensions) playback.
 *
 * Global ManagedMediaSource types are defined in ./mediasource.d.ts
 */

/**
 * Check if MediaSource API is supported.
 */
export function supportsMediaSource(): boolean {
  return typeof MediaSource !== 'undefined';
}

/**
 * Check if ManagedMediaSource API is supported.
 * ManagedMediaSource is a newer Safari API with better lifecycle management.
 */
export function supportsManagedMediaSource(): boolean {
  return typeof ManagedMediaSource !== 'undefined';
}

/**
 * Options for creating a MediaSource.
 */
export interface CreateMediaSourceOptions {
  /** Prefer ManagedMediaSource when available (default: false for broader compatibility). */
  preferManaged?: boolean;
}

/**
 * Create a MediaSource or ManagedMediaSource instance.
 *
 * @param options - Creation options
 * @returns A MediaSource or ManagedMediaSource instance
 * @throws Error if no MediaSource API is available
 *
 * @example
 * const mediaSource = createMediaSource();
 * const mediaElement = document.querySelector('video');
 * attachMediaSource(mediaSource, mediaElement);
 */
export function createMediaSource(options: CreateMediaSourceOptions = {}): MediaSource {
  const { preferManaged = false } = options;

  if (preferManaged && supportsManagedMediaSource()) {
    return new ManagedMediaSource!();
  }

  if (supportsMediaSource()) {
    return new MediaSource();
  }

  throw new Error('MediaSource API is not supported');
}

/**
 * Result of attaching a MediaSource to a media element.
 */
export interface AttachMediaSourceResult {
  /** The object URL created for the MediaSource (empty string for ManagedMediaSource). */
  url: string;
  /** Detach the MediaSource and clean up resources. */
  detach: () => void;
}

/**
 * Attach a MediaSource to an HTMLMediaElement.
 *
 * Uses srcObject for ManagedMediaSource (Safari), or createObjectURL for regular MediaSource.
 *
 * @param mediaSource - The MediaSource to attach
 * @param mediaElement - The media element to attach to
 * @returns Object with URL and detach function
 *
 * @example
 * const mediaSource = createMediaSource();
 * const { detach } = attachMediaSource(mediaSource, videoElement);
 * // Use mediaSource...
 * // Later, to clean up:
 * detach();
 */
export function attachMediaSource(mediaSource: MediaSource, mediaElement: HTMLMediaElement): AttachMediaSourceResult {
  // ManagedMediaSource requires srcObject instead of createObjectURL
  const isManagedMediaSource = supportsManagedMediaSource() && mediaSource instanceof ManagedMediaSource!;

  if (isManagedMediaSource) {
    // ManagedMediaSource requires disableRemotePlayback — without it Safari
    // will not fire sourceopen.
    (mediaElement as HTMLMediaElement & { disableRemotePlayback: boolean }).disableRemotePlayback = true;

    // Use srcObject for ManagedMediaSource
    (mediaElement as HTMLMediaElement & { srcObject: MediaSource | null }).srcObject = mediaSource;

    const detach = (): void => {
      (mediaElement as HTMLMediaElement & { srcObject: MediaSource | null }).srcObject = null;
      mediaElement.load(); // Reset the element
    };

    return { url: '', detach };
  }

  // Use createObjectURL for regular MediaSource
  const url = URL.createObjectURL(mediaSource);
  mediaElement.src = url;

  const detach = (): void => {
    mediaElement.removeAttribute('src');
    mediaElement.load(); // Reset the element
    URL.revokeObjectURL(url);
  };

  return { url, detach };
}

/**
 * Create a SourceBuffer on a MediaSource.
 *
 * @param mediaSource - The MediaSource (must be in 'open' state)
 * @param mimeCodec - MIME type with codecs (e.g., 'video/mp4; codecs="avc1.42E01E"')
 * @returns The created SourceBuffer
 * @throws Error if MediaSource is not open or codec is unsupported
 *
 * @example
 * const buffer = createSourceBuffer(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
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
 * Check if a codec is supported.
 *
 * @param mimeCodec - MIME type with codecs string
 * @returns True if the codec is supported
 *
 * @example
 * if (isCodecSupported('video/mp4; codecs="avc1.42E01E"')) {
 *   // Create source buffer
 * }
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
 * Listens to `sourceopen`, `sourceended`, and `sourceclose` and invokes
 * `onChange` with the current `readyState` after each event. Listeners
 * are automatically removed when `abortSignal` is aborted.
 *
 * @param mediaSource - The MediaSource to observe
 * @param abortSignal - AbortSignal that controls listener lifetime
 * @param onChange - Called with the current readyState after each change
 *
 * @example
 * const controller = new AbortController();
 * onMediaSourceReadyStateChange(mediaSource, controller.signal, (state) => {
 *   if (state === 'open') { ... }
 * });
 * // Later: controller.abort();
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
