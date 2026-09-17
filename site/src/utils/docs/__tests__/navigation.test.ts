import { afterEach, describe, expect, it } from 'vite-plus/test';

import { currentFramework } from '@/stores/preferences';

import { syncFrameworkPreferenceFromUrl } from '../navigation';
import { FRAMEWORK_COOKIE, getFrameworkPreferenceClient } from '../preferences';

describe('syncFrameworkPreferenceFromUrl', () => {
  afterEach(() => {
    currentFramework.set(null);
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
  });

  it('replaces stale framework state with the destination route before a swap', () => {
    currentFramework.set('react');
    document.cookie = `${FRAMEWORK_COOKIE}=react; path=/`;

    syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/framework/html/guides/installation'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('does not change the preference for a framework-agnostic route', () => {
    currentFramework.set('html');
    document.cookie = `${FRAMEWORK_COOKIE}=html; path=/`;

    syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });
});
