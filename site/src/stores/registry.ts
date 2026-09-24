import type {
  InstallationFramework,
  InstallationTemplate,
  RegistryFramework,
  RegistryPreset,
  RegistryStyling,
  RegistryTheme,
} from '@videojs/installation';
import { registryStylings, resolveInstallationTemplateForMethod, resolveRegistryStyling } from '@videojs/installation';
import { atom, computed } from 'nanostores';

import {
  framework as installationFramework,
  selectInstallationAppSetup,
  template as installationTemplate,
} from '@/stores/installation';
import { currentFramework } from '@/stores/preferences';
import { getFrameworkPreferenceClient, setFrameworkPreferenceClient } from '@/utils/docs/preferences';
import {
  isShadcnInstallationUrl,
  resolveShadcnProjectFramework,
  resolveShadcnUrlSelection,
  updateShadcnInstallationUrl,
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
export const registryProjectFramework = installationFramework;

/** React or HTML source shown on the standalone Shadcn installation page. */
export const registryFramework = computed(
  registryProjectFramework,
  (framework): RegistryFramework => (framework === 'react' ? 'react' : 'html')
);

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = atom<RegistryStyling | null>(initialUrlSelection?.styling ?? null);

/** The skin source added by the registry command; `null` lets the page supply its contextual default. */
export const registrySkin = atom<RegistryPreset | null>(null);

/** The skin theme catalog selected on the page; `null` lets an installation skin supply the initial choice. */
export const registryTheme = atom<RegistryTheme | null>(null);

function applyRegistryProjectFramework(
  framework: InstallationFramework,
  requestedTemplate: InstallationTemplate | null = installationTemplate.get(),
  requestedStyling: RegistryStyling | null = registryStyling.get()
): void {
  const sourceFramework: RegistryFramework = framework === 'react' ? 'react' : 'html';
  const nextTemplate = resolveInstallationTemplateForMethod(framework, requestedTemplate, 'shadcn');
  const nextStyling =
    requestedStyling && registryStylings(sourceFramework).includes(requestedStyling) ? requestedStyling : null;

  if (registryProjectFramework.get() !== framework) {
    selectInstallationAppSetup(framework, nextTemplate, false);
  } else if (installationTemplate.get() !== nextTemplate) {
    installationTemplate.set(nextTemplate);
  }

  if (registryStyling.get() !== nextStyling) registryStyling.set(nextStyling);

  if (globalThis.document) {
    document.documentElement.dataset.registryStyling = resolveRegistryStyling(sourceFramework, nextStyling);
  }

  currentFramework.set(sourceFramework);
  setFrameworkPreferenceClient(sourceFramework);
}

/** Synchronize the project framework from an authoritative Shadcn URL without rewriting history. */
export function syncRegistryProjectFramework(framework: InstallationFramework, url?: URL): void {
  const selection = url ? resolveShadcnUrlSelection(url, framework) : null;

  if (selection) applyRegistryProjectFramework(framework, selection.template, selection.styling);
  else applyRegistryProjectFramework(framework);

  if (selection) {
    registrySkin.set(null);
    registryTheme.set(null);
  }
}

/** Select the app framework while deriving the React or HTML registry catalog from it. */
export function selectRegistryProjectFramework(framework: InstallationFramework): void {
  if (globalThis.window) {
    const url = new URL(window.location.href);

    if (isShadcnInstallationUrl(url)) {
      const target = updateShadcnInstallationUrl(url, {
        framework,
        styling: registryStyling.get(),
        template: installationTemplate.get(),
      });

      // Update the shared stores before revealing the prerendered card group for the next framework.
      applyRegistryProjectFramework(framework);
      history.replaceState(history.state, '', `${target.pathname}${target.search}${target.hash}`);
      document.documentElement.dataset.registryProjectFramework = framework;
      document.documentElement.dataset.registryFramework = framework === 'react' ? 'react' : 'html';

      return;
    }
  }

  applyRegistryProjectFramework(framework);
}

function writeRegistryStyling(styling: RegistryStyling): void {
  if (globalThis.window) {
    const url = new URL(window.location.href);

    if (isShadcnInstallationUrl(url)) {
      const target = updateShadcnInstallationUrl(url, { styling });

      history.replaceState(history.state, '', `${target.pathname}${target.search}${target.hash}`);
    }
  }
}

/** Select the Shadcn styling catalog and keep the shareable URL in sync. */
export function selectRegistryStyling(styling: RegistryStyling): void {
  writeRegistryStyling(styling);
  registryStyling.set(styling);

  if (globalThis.document) document.documentElement.dataset.registryStyling = styling;
}
