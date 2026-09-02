import { listen, observeResize } from '@videojs/utils/dom';

import { ThumbnailCore } from '../../core/ui/thumbnail/core';
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
  let boundImg: HTMLImageElement | null = null;
  let stopListeningImg: (() => void) | null = null;
  let observedContainer: HTMLElement | null = null;
  let stopObservingResize: (() => void) | null = null;

  // Sprite sheets that have already failed, so re-entering one does not restart the loading state.
  const failedSrcs = new Set<string>();

  // --- img event listeners ---

  function onImgLoad() {
    if (boundImg) {
      naturalWidth = boundImg.naturalWidth;
      naturalHeight = boundImg.naturalHeight;
    }

    // A sheet that succeeds on a later attempt stops counting as failed.
    failedSrcs.delete(lastSrc);

    loading = false;
    error = false;
    onStateChange();
  }

  function markFailed(): void {
    failedSrcs.add(lastSrc);
    loading = false;
    error = true;
  }

  function onImgError() {
    markFailed();
    onStateChange();
  }

  // --- Element bindings ---
  //
  // Render overrides and remounts can hand back a different img or container for the same source, so every binding
  // pass retargets the listeners and resize observation to whichever elements are in the DOM now.

  function bindImg(img: HTMLImageElement | null): void {
    if (img === boundImg) return;

    stopListeningImg?.();
    stopListeningImg = null;
    boundImg = img;

    if (!img) return;

    const stopLoad = listen(img, 'load', onImgLoad);
    const stopError = listen(img, 'error', onImgError);

    stopListeningImg = () => {
      stopLoad();
      stopError();
    };
  }

  function observeContainer(container: HTMLElement | null): void {
    if (container === observedContainer) return;

    stopObservingResize?.();
    stopObservingResize = null;
    observedContainer = container;

    if (container) stopObservingResize = observeResize(container, onStateChange);
  }

  function ensureBindings(): void {
    bindImg(getImg());
    observeContainer(getContainer());
  }

  // --- src tracking ---

  function updateSrc(url: string | undefined): void {
    ensureBindings();

    const src = url ?? '';
    if (src === lastSrc) return;

    lastSrc = src;

    if (src) {
      // Returning to a sheet already known to fail goes straight back to the error state. Restarting the loading
      // state would flash the skin's spinner shell under the pointer every time scrubbing crosses that boundary. The
      // renderer assigns the src either way, so a sheet that recovers still clears itself on load.
      const failed = failedSrcs.has(src);

      loading = !failed;
      error = failed;
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

    // Settle an image that loaded or failed before its listeners were bound (e.g. a cached image in React, where the
    // element mounts before the effect runs). Notify only when something changed so callers can connect on every commit.
    const img = boundImg;
    if (!img?.complete || !lastSrc) return;

    const wasLoading = loading;
    const wasError = error;
    const previousWidth = naturalWidth;
    const previousHeight = naturalHeight;

    if (img.naturalWidth > 0) {
      naturalWidth = img.naturalWidth;
      naturalHeight = img.naturalHeight;
      loading = false;
      error = false;
    } else {
      markFailed();
    }

    const changed =
      loading !== wasLoading ||
      error !== wasError ||
      naturalWidth !== previousWidth ||
      naturalHeight !== previousHeight;

    if (changed) onStateChange();
  }

  function destroy(): void {
    bindImg(null);
    observeContainer(null);
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
      if (!el) return { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity };

      return core.parseConstraints(getComputedStyle(el));
    },

    updateSrc,
    connect,
    destroy,
  };
}
