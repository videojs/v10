import type {
  InstallationFramework,
  RegistryFramework,
  RegistryPreset,
  RegistryStyling,
  RegistryTemplate,
  RegistryTheme,
} from '@videojs/installation';
import { defaultRegistryTemplate } from '@videojs/installation';
import { atom } from 'nanostores';

import { currentFramework } from '@/stores/preferences';
import { getFrameworkPreferenceClient, setFrameworkPreferenceClient } from '@/utils/docs/preferences';
import {
  isShadcnInstallationUrl,
  resolveShadcnProjectFramework,
  resolveShadcnUrlSelection,
} from '@/utils/installation/framework-navigation';

function getInitialRegistryProjectFramework(): InstallationFramework {
  if (!globalThis.window) return 'react';

  const fallback = getFrameworkPreferenceClient() ?? 'react';

  return resolveShadcnProjectFramework(new URL(window.location.href), fallback) ?? fallback;
}

const initialProjectFramework = getInitialRegistryProjectFramework();
const initialUrl = globalThis.window ? new URL(window.location.href) : null;
const initialUrlSelection = initialUrl ? resolveShadcnUrlSelection(initialUrl, initialProjectFramework) : null;

/** The application framework selected on the Shadcn installation guide. */
export const registryProjectFramework = atom<InstallationFramework>(initialProjectFramework);

/** React or HTML source shown on the standalone Shadcn installation page. */
export const registryFramework = atom<RegistryFramework>(registryProjectFramework.get() === 'react' ? 'react' : 'html');

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = atom<RegistryStyling | null>(initialUrlSelection?.styling ?? null);

/** The skin source added by the registry command; `null` lets the page supply its contextual default. */
export const registrySkin = atom<RegistryPreset | null>(null);

/** The project template passed to `shadcn init`; `null` lets the selected framework supply its default. */
export const registryTemplate = atom<RegistryTemplate | null>(initialUrlSelection?.template ?? null);

/** The skin theme catalog selected on the page; `null` lets an installation skin supply the initial choice. */
export const registryTheme = atom<RegistryTheme | null>(null);

function applyRegistryProjectFramework(framework: InstallationFramework): void {
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

/** Synchronize the project framework from an authoritative Shadcn URL without rewriting history. */
export function syncRegistryProjectFramework(framework: InstallationFramework, url?: URL): void {
  applyRegistryProjectFramework(framework);

  const selection = url ? resolveShadcnUrlSelection(url, framework) : null;

  if (selection) {
    registryTemplate.set(selection.template);
    registryStyling.set(selection.styling);
    registrySkin.set(null);
    registryTheme.set(null);
  }
}

/** Select the app framework while deriving the React or HTML registry catalog from it. */
export function selectRegistryProjectFramework(framework: InstallationFramework): void {
  if (globalThis.window) {
    const url = new URL(window.location.href);

    if (isShadcnInstallationUrl(url)) {
      url.searchParams.set('framework', framework);
      url.searchParams.delete('template');
      url.searchParams.delete('styling');
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
      document.documentElement.dataset.registryFramework = framework === 'react' ? 'react' : 'html';
    }
  }

  applyRegistryProjectFramework(framework);
}

function writeRegistryOption(key: 'styling' | 'template', value: string): void {
  if (globalThis.window) {
    const url = new URL(window.location.href);

    if (isShadcnInstallationUrl(url)) {
      url.searchParams.set(key, value);
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }
}

/** Select the Shadcn project template and keep the shareable URL in sync. */
export function selectRegistryTemplate(template: RegistryTemplate): void {
  writeRegistryOption('template', template);
  registryTemplate.set(template);
}

/** Select the Shadcn styling catalog and keep the shareable URL in sync. */
export function selectRegistryStyling(styling: RegistryStyling): void {
  writeRegistryOption('styling', styling);
  registryStyling.set(styling);
}
