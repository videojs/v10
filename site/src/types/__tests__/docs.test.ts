import { describe, expect, it } from 'vite-plus/test';

import {
  CONTENT_FRAMEWORK_FALLBACK,
  DEFAULT_FRAMEWORK,
  frameworkMatches,
  isValidFramework,
  resolveContentFramework,
  SUPPORTED_FRAMEWORKS,
} from '../docs';

describe('SUPPORTED_FRAMEWORKS', () => {
  it('offers React, HTML, Vue, and Svelte in picker order', () => {
    expect(SUPPORTED_FRAMEWORKS).toEqual(['react', 'html', 'vue', 'svelte']);
  });

  it('keeps react as the default framework', () => {
    expect(DEFAULT_FRAMEWORK).toBe('react');
  });

  it('accepts the fallback frameworks as valid picker values', () => {
    expect(isValidFramework('vue')).toBe(true);
    expect(isValidFramework('svelte')).toBe(true);
    expect(isValidFramework('angular')).toBe(false);
  });
});

describe('resolveContentFramework', () => {
  it('resolves frameworks without an adapter to the HTML API content', () => {
    expect(resolveContentFramework('vue')).toBe('html');
    expect(resolveContentFramework('svelte')).toBe('html');
  });

  it('resolves frameworks with an adapter to themselves', () => {
    expect(resolveContentFramework('react')).toBe('react');
    expect(resolveContentFramework('html')).toBe('html');
  });

  it('only falls back to frameworks that are themselves supported', () => {
    for (const target of Object.values(CONTENT_FRAMEWORK_FALLBACK)) {
      expect(SUPPORTED_FRAMEWORKS).toContain(target);
    }
  });
});

describe('frameworkMatches', () => {
  it('matches every framework when no restriction is given', () => {
    for (const framework of SUPPORTED_FRAMEWORKS) {
      expect(frameworkMatches(framework)).toBe(true);
    }
  });

  it('matches the listed framework exactly', () => {
    expect(frameworkMatches('react', ['react'])).toBe(true);
    expect(frameworkMatches('html', ['html'])).toBe(true);
  });

  it('does not match an unlisted framework', () => {
    expect(frameworkMatches('html', ['react'])).toBe(false);
    expect(frameworkMatches('vue', ['react'])).toBe(false);
  });

  it('matches html content for frameworks that read the HTML API', () => {
    expect(frameworkMatches('vue', ['html'])).toBe(true);
    expect(frameworkMatches('svelte', ['html'])).toBe(true);
  });

  it('matches framework-specific content ahead of the fallback', () => {
    expect(frameworkMatches('vue', ['vue'])).toBe(true);
    expect(frameworkMatches('svelte', ['vue'])).toBe(false);
  });

  it('hides content the framework is excluded from', () => {
    expect(frameworkMatches('vue', ['html'], ['vue'])).toBe(false);
    expect(frameworkMatches('svelte', ['html'], ['vue'])).toBe(true);
  });

  it('applies exclusions to unrestricted content too', () => {
    expect(frameworkMatches('vue', undefined, ['vue'])).toBe(false);
    expect(frameworkMatches('html', undefined, ['vue'])).toBe(true);
  });

  it('lets an exclusion override an exact match', () => {
    expect(frameworkMatches('html', ['html'], ['html'])).toBe(false);
  });
});
