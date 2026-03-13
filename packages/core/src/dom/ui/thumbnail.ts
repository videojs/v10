import { listen } from '@videojs/utils/dom';
import { ThumbnailCore } from '../../core/ui/thumbnail/thumbnail-core';
import type { ThumbnailConstraints } from '../../core/ui/thumbnail/types';

export interface CreateThumbnailOptions {
  getContainer: () => HTMLElement | null;
  getImg: () => HTMLImageElement | null;
  onStateChange: () => void;
}

export interface ThumbnailApi {
  readonly loading: boolean;
  readonly error: boolean;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readConstraints(): ThumbnailConstraints;
  updateSrc(url: string | undefined): void;
  connect(): void;
  destroy(): void;
}

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
