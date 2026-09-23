import {
  fitSelectionToPreset,
  type InstallMethod,
  type Renderer,
  type Skin,
  type UseCase,
} from '@videojs/installation';
import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { atom, onMount, type WritableAtom } from 'nanostores';

import {
  DEFAULT_SELECTION,
  type InstallationUiSelection,
  normalizeInstallationSelectionForRoute,
  parseInstallationSearch,
  serializeInstallationSearch,
} from '@/utils/installation/url-state';

export const renderer = atom<Renderer>(DEFAULT_SELECTION.renderer);
export const skin = atom<Skin>(DEFAULT_SELECTION.skin);
export const useCase = atom<UseCase>(DEFAULT_SELECTION.useCase);
export const sourceUrl = atom<string>(DEFAULT_SELECTION.sourceUrl);

export const installMethod = atom<InstallMethod>(DEFAULT_SELECTION.installMethod);

/** Mux playback ID from successful upload (used by code generation) */
export const muxPlaybackId = atom<string | null>(null);

/**
 * The picks live in the page URL so a reload, a shared link, or coming back from another page lands on the same player.
 * The URL is read once, when the first picker mounts, and rewritten in place on every change so the history stack stays
 * one entry per page.
 */
type SelectionAtoms = { [K in keyof InstallationUiSelection]: WritableAtom<InstallationUiSelection[K]> };

export const selectionAtoms: SelectionAtoms = {
  useCase,
  skin,
  renderer,
  sourceUrl,
  installMethod,
};
let hydratedUrl: string | null = null;
let syncingFromUrl = false;

function currentSelection(): InstallationUiSelection {
  return {
    useCase: useCase.get(),
    skin: skin.get(),
    renderer: renderer.get(),
    sourceUrl: sourceUrl.get(),
    installMethod: installMethod.get(),
  };
}

function normalizeCurrentUrl(target: URL, selection: InstallationUiSelection): void {
  if (!globalThis.location || !globalThis.history || target.href !== location.href) return;

  const search = serializeInstallationSearch(selection, target.search);
  const url = `${target.pathname}${search}${target.hash}`;

  if (url !== `${target.pathname}${target.search}${target.hash}`) {
    history.replaceState(history.state, '', url);
  }

  hydratedUrl = `${target.pathname}${search}`;
}

/** Replace every installation pick from a destination URL before its islands render. */
export function syncInstallationSelectionFromUrl(url?: URL): void {
  const target = url ?? (globalThis.location ? new URL(globalThis.location.href) : null);
  if (!target) return;

  const urlKey = `${target.pathname}${target.search}`;
  const route = target.pathname.match(/\/docs\/guides\/installation\/([^/]+)/)?.[1] ?? '';
  const selection = normalizeInstallationSelectionForRoute(route, parseInstallationSearch(target.search));

  if (hydratedUrl === urlKey) {
    normalizeCurrentUrl(target, selection);

    return;
  }

  hydratedUrl = urlKey;
  syncingFromUrl = true;

  try {
    // Use case first: the skin and media pickers validate against it when they react to a change.
    useCase.set(selection.useCase);
    skin.set(selection.skin);
    renderer.set(selection.renderer);
    sourceUrl.set(selection.sourceUrl);
    installMethod.set(selection.installMethod);
  } finally {
    syncingFromUrl = false;
  }

  normalizeCurrentUrl(target, selection);
}

function writeUrl(): void {
  if (!hydratedUrl || syncingFromUrl || !globalThis.history) return;

  const search = serializeInstallationSearch(currentSelection(), location.search);
  const url = `${location.pathname}${search}${location.hash}`;

  if (url !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(history.state, '', url);
    hydratedUrl = `${location.pathname}${search}`;
  }
}

for (const store of Object.values(selectionAtoms)) {
  onMount(store, () => {
    syncInstallationSelectionFromUrl();

    return store.listen(writeUrl);
  });
}

if (globalThis.document) {
  document.addEventListener('astro:before-swap', (event: TransitionBeforeSwapEvent) => {
    if (event.to.pathname.startsWith('/docs/guides/installation/')) {
      syncInstallationSelectionFromUrl(event.to);
    }
  });
  document.addEventListener('astro:after-swap', () => {
    if (location.pathname.startsWith('/docs/guides/installation/')) {
      syncInstallationSelectionFromUrl();
    }
  });
}

// A new use case can leave the skin and media pointing at options its preset does not offer. Fit them here, from the
// store's own values, so every island agrees. Pickers fixing the store from their rendered props raced hydration: the
// rendered use case was still the server default while the store already held the URL's picks. Registered after the
// mount hooks above so this permanent listener does not mount the store before those hooks exist.
useCase.listen((next) => {
  const fitted = fitSelectionToPreset(next, skin.get(), renderer.get());

  if (fitted.skin !== skin.get()) skin.set(fitted.skin);

  if (fitted.media !== renderer.get()) renderer.set(fitted.media);
});
