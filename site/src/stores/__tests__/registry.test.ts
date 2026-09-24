import { afterEach, describe, expect, it } from 'vitest';

import { selectInstallationTemplate, template } from '@/stores/installation';
import { currentFramework } from '@/stores/preferences';
import {
  registryFramework,
  registryProjectFramework,
  registrySkin,
  registryStyling,
  registryTheme,
  selectRegistryProjectFramework,
  selectRegistryStyling,
  syncRegistryProjectFramework,
} from '@/stores/registry';
import { FRAMEWORK_COOKIE } from '@/utils/docs/preferences';

describe('selectRegistryProjectFramework', () => {
  afterEach(() => {
    currentFramework.set(null);
    registryProjectFramework.set('react');
    registrySkin.set(null);
    registryStyling.set(null);
    template.set('next');
    registryTheme.set(null);
    document.documentElement.removeAttribute('data-registry-framework');
    document.documentElement.removeAttribute('data-registry-project-framework');
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
    window.history.replaceState(null, '', '/');
  });

  it('syncs the registry and site-wide framework preferences', () => {
    registryStyling.set('tailwind');
    template.set('next');

    selectRegistryProjectFramework('html');

    expect(registryFramework.get()).toBe('html');
    expect(currentFramework.get()).toBe('html');
    expect(document.cookie).toContain('vjs_docs_framework=html');
    expect(registryStyling.get()).toBeNull();
    expect(template.get()).toBe('vite');
  });

  it('keeps registry options when only the site-wide preference is stale', () => {
    registryProjectFramework.set('html');
    registryStyling.set('css');
    template.set('astro');
    currentFramework.set('react');

    selectRegistryProjectFramework('html');

    expect(currentFramework.get()).toBe('html');
    expect(registryStyling.get()).toBe('css');
    expect(template.get()).toBe('astro');
  });

  it('updates the Shadcn URL and root attribute for an in-page selection', () => {
    window.history.replaceState({ index: 2, scrollX: 0, scrollY: 320 }, '', '/docs/guides/installation/shadcn');

    selectRegistryProjectFramework('html');

    expect(window.location.href).toContain('/docs/guides/installation/shadcn?framework=html');
    expect(window.history.state).toEqual({ index: 2, scrollX: 0, scrollY: 320 });
    expect(document.documentElement.dataset.registryFramework).toBe('html');
    expect(document.documentElement.dataset.registryProjectFramework).toBe('html');
  });

  it('keeps the Vue project selection while using HTML registry source and site preferences', () => {
    window.history.replaceState(
      null,
      '',
      '/docs/guides/installation/shadcn?framework=react&preset=audio&media=spotify&package-manager=pnpm&source-url=track'
    );

    selectRegistryProjectFramework('vue');

    expect(registryProjectFramework.get()).toBe('vue');
    expect(registryFramework.get()).toBe('html');
    expect(currentFramework.get()).toBe('html');
    expect(window.location.search).toBe(
      '?framework=vue&preset=audio&media=spotify&package-manager=pnpm&source-url=track'
    );
    expect(document.documentElement.dataset.registryFramework).toBe('html');
    expect(document.documentElement.dataset.registryProjectFramework).toBe('vue');
  });

  it('writes template and styling choices into the Shadcn URL', () => {
    window.history.replaceState(null, '', '/docs/guides/installation/shadcn?framework=react&preset=audio');

    selectInstallationTemplate('vite');
    selectRegistryStyling('css');

    expect(window.location.search).toBe('?framework=react&preset=audio&template=vite&styling=css');
    expect(template.get()).toBe('vite');
    expect(registryStyling.get()).toBe('css');
  });

  it('initializes registry choices from an authoritative Shadcn URL', () => {
    registrySkin.set('video');
    registryTheme.set('minimal');
    const url = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=vue&template=nuxt&styling=css');

    syncRegistryProjectFramework('vue', url);

    expect(registryProjectFramework.get()).toBe('vue');
    expect(template.get()).toBe('nuxt');
    expect(registryStyling.get()).toBe('css');
    expect(registrySkin.get()).toBeNull();
    expect(registryTheme.get()).toBeNull();
  });

  it('syncs a destination without rewriting the departing URL', () => {
    window.history.replaceState({ index: 2 }, '', '/docs/guides/installation/react?preset=audio');

    syncRegistryProjectFramework('html');

    expect(window.location.pathname).toBe('/docs/guides/installation/react');
    expect(window.location.search).toBe('?preset=audio');
    expect(window.history.state).toEqual({ index: 2 });
    expect(registryFramework.get()).toBe('html');
  });
});
