import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { currentFramework } from '@/stores/preferences';
import { FRAMEWORK_COOKIE, getFrameworkPreferenceClient } from '@/utils/docs/preferences';

import { PreferenceSync } from '../PreferenceSync';

describe('PreferenceSync', () => {
  afterEach(() => {
    cleanup();
    currentFramework.set(null);
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
  });

  it('bootstraps an uninitialized store from the cookie', () => {
    document.cookie = `${FRAMEWORK_COOKIE}=html; path=/`;

    render(<PreferenceSync />);

    expect(currentFramework.get()).toBe('html');
  });

  it('does not overwrite an authoritative route value with a stale cookie', () => {
    currentFramework.set('html');
    document.cookie = `${FRAMEWORK_COOKIE}=react; path=/`;

    render(<PreferenceSync />);

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('persists later framework changes', () => {
    document.cookie = `${FRAMEWORK_COOKIE}=html; path=/`;
    render(<PreferenceSync />);

    act(() => currentFramework.set('react'));

    expect(getFrameworkPreferenceClient()).toBe('react');
  });
});
