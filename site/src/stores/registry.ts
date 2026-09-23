import { atom } from 'nanostores';

import { currentFramework } from '@/stores/preferences';
import { getFrameworkPreferenceClient, setFrameworkPreferenceClient } from '@/utils/docs/preferences';
import {
  isShadcnInstallationUrl,
  resolveShadcnProjectFramework,
  type InstallationPickerFramework,
} from '@/utils/installation/framework-navigation';
import type {
  RegistryFramework,
  RegistryPreset,
  RegistryStyling,
  RegistryTemplate,
  RegistryTheme,
} from '@/utils/installation/shadcn';
import { defaultRegistryTemplate } from '@/utils/installation/shadcn';

function getInitialRegistryProjectFramework(): InstallationPickerFramework {
  if (!globalThis.window) return 'react';

  const fallback = getFrameworkPreferenceClient() ?? 'react';

  return resolveShadcnProjectFramework(new URL(window.location.href), fallback) ?? fallback;
}

/** The application framework selected on the Shadcn installation guide. */
export const registryProjectFramework = atom<InstallationPickerFramework>(getInitialRegistryProjectFramework());

/** React or HTML source shown on the standalone Shadcn installation page. */
export const registryFramework = atom<RegistryFramework>(registryProjectFramework.get() === 'react' ? 'react' : 'html');

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = atom<RegistryStyling | null>(null);

/** The skin source added by the registry command; `null` lets the page supply its contextual default. */
export const registrySkin = atom<RegistryPreset | null>(null);

/** The project template passed to `shadcn init`; `null` lets the selected framework supply its default. */
export const registryTemplate = atom<RegistryTemplate | null>(null);

/** The skin theme catalog selected on the page; `null` lets an installation skin supply the initial choice. */
export const registryTheme = atom<RegistryTheme | null>(null);

function applyRegistryProjectFramework(framework: InstallationPickerFramework): void {
  const sourceFramework: RegistryFramework = framework === 'react' ? 'react' : 'html';

  if (registryProjectFramework.get() !== framework) {
    registryProjectFramework.set(framework);
    registryTemplate.set(defaultRegistryTemplate(framework));
    registryStyling.set(null);
  }

  registryFramework.set(sourceFramework);
  currentFramework.set(sourceFramework);
  setFrameworkPreferenceClient(sourceFramework);
}

/** Synchronize Shadcn state from an authoritative URL without rewriting the active history entry. */
export function syncRegistryFramework(framework: RegistryFramework): void {
  applyRegistryProjectFramework(framework);
}

/** Synchronize the project framework from an authoritative Shadcn URL without rewriting history. */
export function syncRegistryProjectFramework(framework: InstallationPickerFramework): void {
  applyRegistryProjectFramework(framework);
}

/** Select the Shadcn source framework and keep its URL, panels, and site-wide preference in sync. */
export function selectRegistryFramework(framework: RegistryFramework): void {
  selectRegistryProjectFramework(framework);
}

/** Select the app framework while deriving the React or HTML registry catalog from it. */
export function selectRegistryProjectFramework(framework: InstallationPickerFramework): void {
  if (globalThis.window) {
    const url = new URL(window.location.href);

    if (isShadcnInstallationUrl(url)) {
      url.searchParams.set('framework', framework);
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
      document.documentElement.dataset.registryFramework = framework === 'react' ? 'react' : 'html';
    }
  }

  applyRegistryProjectFramework(framework);
}
