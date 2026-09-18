import { afterEach, describe, expect, it } from 'vitest';

import { currentFramework } from '@/stores/preferences';
import { registryFramework, registryStyling, registryTemplate, selectRegistryFramework } from '@/stores/registry';
import { FRAMEWORK_COOKIE } from '@/utils/docs/preferences';

describe('selectRegistryFramework', () => {
  afterEach(() => {
    currentFramework.set(null);
    registryFramework.set('react');
    registryStyling.set(null);
    registryTemplate.set(null);
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
  });

  it('syncs the registry and site-wide framework preferences', () => {
    registryStyling.set('tailwind');
    registryTemplate.set('next');

    selectRegistryFramework('html');

    expect(registryFramework.get()).toBe('html');
    expect(currentFramework.get()).toBe('html');
    expect(document.cookie).toContain('vjs_docs_framework=html');
    expect(registryStyling.get()).toBeNull();
    expect(registryTemplate.get()).toBe('vite');
  });

  it('keeps registry options when only the site-wide preference is stale', () => {
    registryFramework.set('html');
    registryStyling.set('css');
    registryTemplate.set('astro');
    currentFramework.set('react');

    selectRegistryFramework('html');

    expect(currentFramework.get()).toBe('html');
    expect(registryStyling.get()).toBe('css');
    expect(registryTemplate.get()).toBe('astro');
  });
});
