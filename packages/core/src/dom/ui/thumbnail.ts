import { listen } from '@videojs/utils/dom';
import { ThumbnailCore } from '../../core/ui/thumbnail/thumbnail-core';
import type { ThumbnailConstraints } from '../../core/ui/thumbnail/types';

/** Options for {@link createThumbnail}. */
export interface CreateThumbnailOptions {
  /** Accessor for the thumbnail container element. */
  getContainer: () => HTMLElement | null;
  /** Accessor for the inner image element. */
  getImg: () => HTMLImageElement | null;
  /** Called whenever loading, error, or natural-size state changes. */
  onStateChange: () => void;
}

/** Imperative handle returned by {@link createThumbnail}. */
export interface ThumbnailApi {
  /** Whether the image is currently loading. */
  readonly loading: boolean;
  /** Whether the image failed to load. */
  readonly error: boolean;
  /** Natural width of the loaded image, or `0` when not loaded. */
  readonly naturalWidth: number;
  /** Natural height of the loaded image, or `0` when not loaded. */
  readonly naturalHeight: number;
  /** Read box constraints from the container's computed style. */
  readConstraints(): ThumbnailConstraints;
  /** Push a new image URL into the controller. */
  updateSrc(url: string | undefined): void;
  /** Bind image listeners and synchronize state with already-loaded images. */
  connect(): void;
  /** Tear down listeners and observers. */
  destroy(): void;
}

/**
 * Build a thumbnail DOM controller that tracks load state and container size.
 *
 * @param options - Element accessors and a change callback.
 */
export function createThumbnail(options: CreateThumbnailOptions): ThumbnailApi {
  const { getContainer, getImg, onStateChange } = options;
  const core = new ThumbnailCore();
  const abort = new AbortController();
  const signal = abort.signal;

  let loading = false;
  let error = false;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let lastSrc = '';
  let imgBound = false;
  let resizeObserver: ResizeObserver | null = null;

  // --- img event listeners ---

  function onImgLoad() {
    const img = getImg();

    if (img) {
      naturalWidth = img.naturalWidth;
      naturalHeight = img.naturalHeight;
    }

    loading = false;
    error = false;
    onStateChange();
  }

  function onImgError() {
    loading = false;
    error = true;
    onStateChange();
  }

  function bindImg(img: HTMLImageElement): void {
    listen(img, 'load', onImgLoad, { signal });
    listen(img, 'error', onImgError, { signal });
  }

  // --- Lazy binding ---

  function ensureBindings(): void {
    if (!imgBound) {
      const img = getImg();

      if (img) {
        bindImg(img);
        imgBound = true;
      }
    }

    if (!resizeObserver) {
      const container = getContainer();

      if (container) {
        resizeObserver = new ResizeObserver(onStateChange);
        resizeObserver.observe(container);
      }
    }
  }

  // --- src tracking ---

  function updateSrc(url: string | undefined): void {
    ensureBindings();

    const src = url ?? '';

    if (src === lastSrc) return;

    lastSrc = src;

    if (src) {
      loading = true;
      error = false;
    } else {
      loading = false;
      error = false;
      naturalWidth = 0;
      naturalHeight = 0;
    }
  }

  // --- connect / cleanup ---

  function connect(): void {
    ensureBindings();

    // Handle the case where the img already loaded or errored before listeners
    // were bound (e.g., cached image in React where mount happens before useEffect).
    const img = getImg();

    if (img?.complete && lastSrc) {
      if (img.naturalWidth > 0) {
        naturalWidth = img.naturalWidth;
        naturalHeight = img.naturalHeight;
        loading = false;
        error = false;
      } else {
        loading = false;
        error = true;
      }

      onStateChange();
    }
  }

  function destroy(): void {
    abort.abort();
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  return {
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get naturalWidth() {
      return naturalWidth;
    },
    get naturalHeight() {
      return naturalHeight;
    },

    readConstraints(): ThumbnailConstraints {
      const el = getContainer();

      if (!el) {
        return { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity };
      }

      return core.parseConstraints(getComputedStyle(el));
    },

    updateSrc,
    connect,
    destroy,
  };
}
