import { atom, onMount, type WritableAtom } from 'nanostores';

import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import {
  DEFAULT_SELECTION,
  type InstallationSelection,
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
type SelectionAtoms = { [K in keyof InstallationSelection]: WritableAtom<InstallationSelection[K]> };

export const selectionAtoms: SelectionAtoms = {
  useCase,
  skin,
  renderer,
  sourceUrl,
  installMethod,
};
let hydratedFromUrl = false;

function currentSelection(): InstallationSelection {
  return {
    useCase: useCase.get(),
    skin: skin.get(),
    renderer: renderer.get(),
    sourceUrl: sourceUrl.get(),
    installMethod: installMethod.get(),
  };
}

function readUrl(): void {
  if (hydratedFromUrl || !globalThis.location) return;

  hydratedFromUrl = true;
  const selection = parseInstallationSearch(location.search);

  // Use case first: the skin and media pickers validate against it when they react to a change.
  useCase.set(selection.useCase);
  skin.set(selection.skin);
  renderer.set(selection.renderer);
  sourceUrl.set(selection.sourceUrl);
  installMethod.set(selection.installMethod);
}

function writeUrl(): void {
  if (!hydratedFromUrl || !globalThis.history) return;

  const search = serializeInstallationSearch(currentSelection(), location.search);
  const url = `${location.pathname}${search}${location.hash}`;

  if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', url);
}

for (const store of Object.values(selectionAtoms)) {
  onMount(store, () => {
    readUrl();

    return store.listen(writeUrl);
  });
}
