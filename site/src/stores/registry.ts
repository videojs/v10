import type { RegistryFramework, RegistryPreset, RegistryStyling, RegistryTheme } from '@videojs/installation';
import { registryStylings, resolveInstallationTemplateForMethod, sourceFrameworkFor } from '@videojs/installation';
import { atom, computed } from 'nanostores';

import {
  framework as installationFramework,
  styling as installationStyling,
  template as installationTemplate,
  updateInstallationSelection,
} from '@/stores/installation';
import { currentFramework } from '@/stores/preferences';
import { setFrameworkPreferenceClient } from '@/utils/docs/preferences';

/** The installation framework narrowed to the React or HTML app selected on the Shadcn installation guide. */
export const registryFramework = computed(installationFramework, sourceFrameworkFor);

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = installationStyling;

/** The skin source added by the registry command; `null` lets the page supply its contextual default. */
export const registrySkin = atom<RegistryPreset | null>(null);

/** The skin theme catalog selected on the page; `null` lets an installation skin supply the initial choice. */
export const registryTheme = atom<RegistryTheme | null>(null);

/** Select the React or HTML app framework, keeping the app setup and styling the next framework also offers. */
export function selectRegistryFramework(framework: RegistryFramework): void {
  const selectedStyling = registryStyling.get();

  updateInstallationSelection({
    framework,
    template: resolveInstallationTemplateForMethod(framework, installationTemplate.get(), 'shadcn'),
    styling: selectedStyling && registryStylings(framework).includes(selectedStyling) ? selectedStyling : null,
  });
  currentFramework.set(framework);
  setFrameworkPreferenceClient(framework);
}

/** Select the Shadcn styling catalog. */
export function selectRegistryStyling(styling: RegistryStyling): void {
  updateInstallationSelection({ styling });
}

// Skin and theme choices belong to the page they were made on; the next page starts from its installation picks.
if (globalThis.document) {
  document.addEventListener('astro:before-swap', () => {
    registrySkin.set(null);
    registryTheme.set(null);
  });
}
