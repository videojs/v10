import type {
  InstallationFramework,
  InstallationTemplate,
  RegistryFramework,
  RegistryPreset,
  RegistryStyling,
  RegistryTheme,
} from '@videojs/installation';
import type { ReadableAtom } from 'nanostores';
import { useSyncExternalStore } from 'react';

import { template } from '@/stores/installation';
import {
  registryFramework,
  registryProjectFramework,
  registrySkin,
  registryStyling,
  registryTheme,
} from '@/stores/registry';

function useRegistryStore<Value>(store: ReadableAtom<Value>, serverValue: Value): Value {
  return useSyncExternalStore(
    (onChange) => store.listen(onChange),
    () => store.get(),
    () => serverValue
  );
}

/** Hydrate with the prerendered route framework, then switch synchronously to the query-backed framework. */
export function useRegistryProjectFramework(serverFramework: InstallationFramework): InstallationFramework {
  return useRegistryStore(registryProjectFramework, serverFramework);
}

/** Hydrate the global docs selector with its prerendered React or HTML route before reading the Shadcn query. */
export function useRegistryFramework(serverFramework: RegistryFramework): RegistryFramework {
  return useRegistryStore(registryFramework, serverFramework);
}

export function useInstallationTemplate(serverTemplate: InstallationTemplate): InstallationTemplate {
  return useRegistryStore(template, serverTemplate);
}

export function useRegistryStyling(): RegistryStyling | null {
  return useRegistryStore(registryStyling, null);
}

export function useRegistrySkin(): RegistryPreset | null {
  return useRegistryStore(registrySkin, null);
}

export function useRegistryTheme(): RegistryTheme | null {
  return useRegistryStore(registryTheme, null);
}
