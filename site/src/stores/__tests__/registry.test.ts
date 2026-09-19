import { afterEach, describe, expect, it } from 'vitest';

import { currentFramework } from '@/stores/preferences';
import {
  registryFramework,
  registryStyling,
  registryTemplate,
  selectRegistryFramework,
  syncRegistryFramework,
} from '@/stores/registry';
import { FRAMEWORK_COOKIE } from '@/utils/docs/preferences';

describe('selectRegistryFramework', () => {
  afterEach(() => {
    currentFramework.set(null);
    registryFramework.set('react');
    registryStyling.set(null);
    registryTemplate.set(null);
    document.documentElement.removeAttribute('data-registry-framework');
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
    window.history.replaceState(null, '', '/');
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

  it('updates the Shadcn URL and root attribute for an in-page selection', () => {
    window.history.replaceState({ index: 2, scrollX: 0, scrollY: 320 }, '', '/docs/guides/installation/shadcn');

    selectRegistryFramework('html');

    expect(window.location.href).toContain('/docs/guides/installation/shadcn?framework=html');
    expect(window.history.state).toEqual({ index: 2, scrollX: 0, scrollY: 320 });
    expect(document.documentElement.dataset.registryFramework).toBe('html');
  });

  it('syncs a destination without rewriting the departing URL', () => {
    window.history.replaceState({ index: 2 }, '', '/docs/guides/installation/react?preset=audio');

    syncRegistryFramework('html');

    expect(window.location.pathname).toBe('/docs/guides/installation/react');
    expect(window.location.search).toBe('?preset=audio');
    expect(window.history.state).toEqual({ index: 2 });
    expect(registryFramework.get()).toBe('html');
  });
});
