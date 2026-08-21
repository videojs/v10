import { listen, observeResize } from '@videojs/utils/dom';
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

  let loading = false;
  let error = false;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let lastSrc = '';
  let connectedSrc = '';
  let boundImg: HTMLImageElement | null = null;
  let observedContainer: HTMLElement | null = null;
  let imgNeedsReconcile = false;
  let stopListeningImg: (() => void) | null = null;
  let stopObservingResize: (() => void) | null = null;

  // --- img event listeners ---

  function onImgLoad(event: Event) {
    const img = boundImg;

    if (!img || event.currentTarget !== img) return;

    naturalWidth = img.naturalWidth;
    naturalHeight = img.naturalHeight;

    loading = false;
    error = false;
    onStateChange();
  }

  function onImgError(event: Event) {
    if (event.currentTarget !== boundImg) return;

    loading = false;
    error = true;
    onStateChange();
  }

  function bindImg(img: HTMLImageElement): void {
    const stopLoad = listen(img, 'load', onImgLoad);
    const stopError = listen(img, 'error', onImgError);
    stopListeningImg = () => {
      stopLoad();
      stopError();
    };
  }

  // --- Lazy binding ---

  function ensureBindings(): void {
    const img = getImg();

    if (img !== boundImg) {
      stopListeningImg?.();
      stopListeningImg = null;
      boundImg = img;
      imgNeedsReconcile = true;
      if (img) bindImg(img);
    }

    const container = getContainer();

    if (container !== observedContainer) {
      stopObservingResize?.();
      stopObservingResize = null;
      observedContainer = container;
      if (container) stopObservingResize = observeResize(container, onStateChange);
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

    const shouldReconcileImg = imgNeedsReconcile || connectedSrc !== lastSrc;
    imgNeedsReconcile = false;
    connectedSrc = lastSrc;

    if (!shouldReconcileImg) return;

    // Handle the case where the img already loaded or errored before listeners
    // were bound (e.g., cached image in React where mount happens before useEffect).
    const img = boundImg;

    if (img && lastSrc) {
      const previousLoading = loading;
      const previousError = error;
      const previousNaturalWidth = naturalWidth;
      const previousNaturalHeight = naturalHeight;

      if (img.naturalWidth > 0) {
        naturalWidth = img.naturalWidth;
        naturalHeight = img.naturalHeight;
        loading = false;
        error = false;
      } else if (img.complete) {
        naturalWidth = 0;
        naturalHeight = 0;
        loading = false;
        error = true;
      } else {
        naturalWidth = 0;
        naturalHeight = 0;
        loading = true;
        error = false;
      }

      if (
        loading !== previousLoading ||
        error !== previousError ||
        naturalWidth !== previousNaturalWidth ||
        naturalHeight !== previousNaturalHeight
      ) {
        onStateChange();
      }
    }
  }

  function destroy(): void {
    stopListeningImg?.();
    stopListeningImg = null;
    boundImg = null;
    stopObservingResize?.();
    stopObservingResize = null;
    observedContainer = null;
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
