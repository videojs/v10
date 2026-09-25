import type {
  InstallationTemplate,
  RegistryFramework,
  RegistryPreset,
  RegistryStyling,
  RegistryTheme,
} from '@videojs/installation';
import {
  registryStylings,
  resolveInstallationTemplateForMethod,
  resolveRegistryStyling,
  sourceFrameworkFor,
} from '@videojs/installation';
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
  resolveShadcnFramework,
  resolveShadcnUrlSelection,
  updateShadcnInstallationUrl,
} from '@/utils/installation/framework-navigation';

function getInitialRegistryFramework(): RegistryFramework {
  if (!globalThis.window) return 'react';

  const fallback = getFrameworkPreferenceClient() ?? 'react';

  return resolveShadcnFramework(new URL(window.location.href), fallback) ?? fallback;
}

const initialFramework = getInitialRegistryFramework();
const initialUrl = globalThis.window ? new URL(window.location.href) : null;
const initialUrlSelection = initialUrl ? resolveShadcnUrlSelection(initialUrl, initialFramework) : null;

/** The installation framework narrowed to the React or HTML app selected on the Shadcn installation guide. */
export const registryFramework = computed(installationFramework, sourceFrameworkFor);

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = atom<RegistryStyling | null>(initialUrlSelection?.styling ?? null);

/** The skin source added by the registry command; `null` lets the page supply its contextual default. */
export const registrySkin = atom<RegistryPreset | null>(null);

/** The skin theme catalog selected on the page; `null` lets an installation skin supply the initial choice. */
export const registryTheme = atom<RegistryTheme | null>(null);

function applyRegistryFramework(
  framework: RegistryFramework,
  requestedTemplate: InstallationTemplate | null = installationTemplate.get(),
  requestedStyling: RegistryStyling | null = registryStyling.get()
): void {
  const nextTemplate = resolveInstallationTemplateForMethod(framework, requestedTemplate, 'shadcn');
  const nextStyling =
    requestedStyling && registryStylings(framework).includes(requestedStyling) ? requestedStyling : null;

  if (installationFramework.get() !== framework) {
    selectInstallationAppSetup(framework, nextTemplate, false);
  } else if (installationTemplate.get() !== nextTemplate) {
    installationTemplate.set(nextTemplate);
  }

  if (registryStyling.get() !== nextStyling) registryStyling.set(nextStyling);

  if (globalThis.document) {
    document.documentElement.dataset.registryStyling = resolveRegistryStyling(framework, nextStyling);
  }

  currentFramework.set(framework);
  setFrameworkPreferenceClient(framework);
}

/** Synchronize the framework from an authoritative Shadcn URL without rewriting history. */
export function syncRegistryFramework(framework: RegistryFramework, url?: URL): void {
  const selection = url ? resolveShadcnUrlSelection(url, framework) : null;

  if (selection) applyRegistryFramework(framework, selection.template, selection.styling);
  else applyRegistryFramework(framework);

  if (selection) {
    registrySkin.set(null);
    registryTheme.set(null);
  }
}

/** Select the React or HTML app framework and its matching registry catalog. */
export function selectRegistryFramework(framework: RegistryFramework): void {
  if (globalThis.window) {
    const url = new URL(window.location.href);

    if (isShadcnInstallationUrl(url)) {
      const target = updateShadcnInstallationUrl(url, {
        framework,
        styling: registryStyling.get(),
        template: installationTemplate.get(),
      });

      // Update the shared stores before revealing the prerendered card group for the next framework.
      applyRegistryFramework(framework);
      history.replaceState(history.state, '', `${target.pathname}${target.search}${target.hash}`);
      document.documentElement.dataset.registryFramework = framework;

      return;
    }
  }

  applyRegistryFramework(framework);
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
