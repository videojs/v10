import type { RegistryFramework, RegistryPreset, RegistryStyling, RegistryTheme } from '@videojs/installation';

import { registryFramework, registrySkin, registryStyling, registryTheme } from '@/stores/registry';
import { useHydratedStore } from '@/utils/useHydratedStore';

/** Hydrate with the prerendered React or HTML route framework, then switch synchronously to the query-backed one. */
export function useRegistryFramework(serverFramework: RegistryFramework): RegistryFramework {
  return useHydratedStore(registryFramework, serverFramework);
}

export function useRegistryStyling(): RegistryStyling | null {
  return useHydratedStore(registryStyling, null);
}

export function useRegistrySkin(): RegistryPreset | null {
  return useHydratedStore(registrySkin, null);
}

export function useRegistryTheme(): RegistryTheme | null {
  return useHydratedStore(registryTheme, null);
}
