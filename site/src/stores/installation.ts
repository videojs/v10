import {
  defaultInstallationExtensions,
  fitSelectionToPreset,
  getInstallationPreset,
  installationExtensionsFor,
  resolveInstallationTemplate,
  type InstallMethod,
  type InstallationFramework,
  type InstallationExtension,
  type InstallationProject,
  type InstallationTemplate,
  type Renderer,
  type Skin,
  type UseCase,
} from '@videojs/installation';
import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { atom, onMount, type WritableAtom } from 'nanostores';

import { getFrameworkPreferenceClient } from '@/utils/docs/preferences';
import { getInstallationRouteSegment } from '@/utils/installation/routes';
import {
  DEFAULT_SELECTION,
  type InstallationUiSelection,
  parseInstallationSearchForRoute,
  serializeInstallationSearchForRoute,
} from '@/utils/installation/url-state';

function selectionFromUrl(target: Pick<URL, 'pathname' | 'search'>): InstallationUiSelection {
  const route = getInstallationRouteSegment(target.pathname);
  if (!route) return DEFAULT_SELECTION;

  const shadcnFramework = getFrameworkPreferenceClient() ?? DEFAULT_SELECTION.framework;

  return parseInstallationSearchForRoute(route, target.search, shadcnFramework);
}

function selectionFromCurrentUrl(): InstallationUiSelection {
  return globalThis.location ? selectionFromUrl(location) : DEFAULT_SELECTION;
}

const initialSelection = selectionFromCurrentUrl();

export const renderer = atom<Renderer>(initialSelection.renderer);
export const extensions = atom<readonly InstallationExtension[]>(initialSelection.extensions);
export const framework = atom<InstallationFramework>(initialSelection.framework);
export const template = atom<InstallationTemplate>(initialSelection.template);
export const project = atom<InstallationProject>(initialSelection.project);
export const skin = atom<Skin>(initialSelection.skin);
export const useCase = atom<UseCase>(initialSelection.useCase);
export const sourceUrl = atom<string>(initialSelection.sourceUrl);

export const installMethod = atom<InstallMethod>(initialSelection.installMethod);

/** Mux playback ID from successful upload (used by code generation) */
export const muxPlaybackId = atom<string | null>(null);

/**
 * The picks live in the page URL so a reload, a shared link, or coming back from another page lands on the same player.
 * At module initialization the atoms start from the URL, and every change rewrites it in place so the history stack
 * stays one entry per page.
 */
type SelectionAtoms = { [K in keyof InstallationUiSelection]: WritableAtom<InstallationUiSelection[K]> };

export const selectionAtoms: SelectionAtoms = {
  framework,
  template,
  project,
  useCase,
  skin,
  renderer,
  extensions,
  sourceUrl,
  installMethod,
};
let hydratedUrl = globalThis.location ? `${location.pathname}${location.search}` : null;
let syncingFromUrl = false;

export function currentInstallationSelection(): InstallationUiSelection {
  return {
    framework: framework.get(),
    template: template.get(),
    project: project.get(),
    useCase: useCase.get(),
    skin: skin.get(),
    renderer: renderer.get(),
    extensions: extensions.get(),
    sourceUrl: sourceUrl.get(),
    installMethod: installMethod.get(),
  };
}

function syncInstallationDocumentState(selection: InstallationUiSelection): void {
  if (!globalThis.document || !getInstallationRouteSegment(location.pathname)) return;

  document.documentElement.dataset.installationPreset = getInstallationPreset(selection.useCase).flag;
  document.documentElement.dataset.installationMedia = selection.renderer;
  document.documentElement.dataset.installationProject = selection.project;
  document.documentElement.dataset.installationSkin = selection.skin === 'none' ? 'none' : 'default';
  document.documentElement.dataset.installationTemplate = selection.template;
}

function normalizeCurrentUrl(target: URL, selection: InstallationUiSelection): void {
  if (!globalThis.location || !globalThis.history || target.href !== location.href) return;

  const route = getInstallationRouteSegment(target.pathname) ?? '';
  const search = serializeInstallationSearchForRoute(route, selection, target.search);
  const url = `${target.pathname}${search}${target.hash}`;

  if (url !== `${target.pathname}${target.search}${target.hash}`) {
    history.replaceState(history.state, '', url);
  }

  hydratedUrl = `${target.pathname}${search}`;
}

/** Replace every installation pick from a destination URL before its islands render. */
export function syncInstallationSelectionFromUrl(url?: URL): void {
  const target = url ?? (globalThis.location ? new URL(globalThis.location.href) : null);
  if (!target || !getInstallationRouteSegment(target.pathname)) return;

  const urlKey = `${target.pathname}${target.search}`;
  const selection = selectionFromUrl(target);

  if (hydratedUrl === urlKey) {
    normalizeCurrentUrl(target, selection);
    syncInstallationDocumentState(selection);

    return;
  }

  hydratedUrl = urlKey;
  syncingFromUrl = true;

  try {
    framework.set(selection.framework);
    template.set(selection.template);
    project.set(selection.project);
    // Use case first: the skin and media pickers validate against it when they react to a change.
    useCase.set(selection.useCase);
    skin.set(selection.skin);
    renderer.set(selection.renderer);
    extensions.set(selection.extensions);
    sourceUrl.set(selection.sourceUrl);
    installMethod.set(selection.installMethod);
  } finally {
    syncingFromUrl = false;
  }

  normalizeCurrentUrl(target, selection);
  syncInstallationDocumentState(selection);
}

function writeUrl(): void {
  if (!hydratedUrl || syncingFromUrl || !globalThis.history) return;

  const route = getInstallationRouteSegment(location.pathname);
  if (!route) return;

  syncInstallationDocumentState(currentInstallationSelection());

  const search = serializeInstallationSearchForRoute(route, currentInstallationSelection(), location.search);
  const url = `${location.pathname}${search}${location.hash}`;

  if (url !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(history.state, '', url);
    hydratedUrl = `${location.pathname}${search}`;
  }
}

/** Apply the framework and app setup as one URL-backed selection change. */
export function selectInstallationAppSetup(
  nextFramework: InstallationFramework,
  nextTemplate: InstallationTemplate,
  write = true
): void {
  syncingFromUrl = true;

  try {
    framework.set(nextFramework);
    template.set(nextTemplate);

    if (nextTemplate === 'none') project.set('existing');
  } finally {
    syncingFromUrl = false;
  }

  if (write) writeUrl();
}

export function selectInstallationTemplate(nextTemplate: InstallationTemplate): void {
  if (globalThis.location) syncInstallationSelectionFromUrl(new URL(location.href));

  const selectedFramework = framework.get();

  const resolvedTemplate = resolveInstallationTemplate(selectedFramework, nextTemplate);

  selectInstallationAppSetup(selectedFramework, resolvedTemplate);
}

export function selectInstallationStartingPoint(nextProject: InstallationProject): void {
  project.set(template.get() === 'none' ? 'existing' : nextProject);
}

for (const store of Object.values(selectionAtoms)) {
  onMount(store, () => {
    syncInstallationSelectionFromUrl();

    return store.listen(writeUrl);
  });
}

if (globalThis.document) {
  syncInstallationDocumentState(initialSelection);

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

  const available = installationExtensionsFor(next, skin.get(), renderer.get());
  const selected = extensions.get().filter((extension) => available.includes(extension));

  if (selected.length !== extensions.get().length) extensions.set(selected);
});

skin.listen((next) => {
  const available = installationExtensionsFor(useCase.get(), next, renderer.get());
  const selected = extensions.get().filter((extension) => available.includes(extension));

  if (selected.length !== extensions.get().length) extensions.set(selected);
});

renderer.listen((next) => {
  const available = installationExtensionsFor(useCase.get(), skin.get(), next);
  const selected = extensions.get().filter((extension) => available.includes(extension));
  const defaults = defaultInstallationExtensions(next).filter((extension) => available.includes(extension));
  const fitted = [...new Set([...selected, ...defaults])];

  if (
    fitted.length !== extensions.get().length ||
    fitted.some((extension, index) => extensions.get()[index] !== extension)
  ) {
    extensions.set(fitted);
  }
});
