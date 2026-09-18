import { atom } from 'nanostores';

import { currentFramework } from '@/stores/preferences';
import { setFrameworkPreferenceClient } from '@/utils/docs/preferences';
import type {
  RegistryFramework,
  RegistryPreset,
  RegistryStyling,
  RegistryTemplate,
  RegistryTheme,
} from '@/utils/installation/shadcn';
import { defaultRegistryTemplate } from '@/utils/installation/shadcn';

/** React or HTML source shown on the standalone Shadcn installation page. */
export const registryFramework = atom<RegistryFramework>('react');

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = atom<RegistryStyling | null>(null);

/** The skin files added by the registry command; `null` lets the page supply its contextual default. */
export const registrySkin = atom<RegistryPreset | null>(null);

/** The project template passed to `shadcn init`; `null` lets the selected framework supply its default. */
export const registryTemplate = atom<RegistryTemplate | null>(null);

/** The skin theme catalog selected on the page; `null` lets an installation skin supply the initial choice. */
export const registryTheme = atom<RegistryTheme | null>(null);

/** Select the Shadcn source framework and keep the site-wide docs preference in sync. */
export function selectRegistryFramework(framework: RegistryFramework): void {
  if (registryFramework.get() !== framework) {
    registryFramework.set(framework);
    registryTemplate.set(defaultRegistryTemplate(framework));
    registryStyling.set(null);
  }

  currentFramework.set(framework);
  setFrameworkPreferenceClient(framework);
}
