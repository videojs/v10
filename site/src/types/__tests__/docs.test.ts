import { describe, expect, it } from 'vite-plus/test';

import {
  apiPlatformFrameworks,
  CONTENT_FRAMEWORK_FALLBACK,
  DEFAULT_FRAMEWORK,
  frameworkMatches,
  HTML_API_FRAMEWORKS,
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

describe('HTML_API_FRAMEWORKS', () => {
  it('lists every framework that reads the custom-element API', () => {
    expect(HTML_API_FRAMEWORKS).toEqual(['html', 'vue', 'svelte']);
  });

  it('only names supported frameworks', () => {
    for (const framework of HTML_API_FRAMEWORKS) {
      expect(SUPPORTED_FRAMEWORKS).toContain(framework);
    }
  });

  it('makes html-API content visible to each of its readers', () => {
    for (const framework of HTML_API_FRAMEWORKS) {
      expect(frameworkMatches(framework, HTML_API_FRAMEWORKS)).toBe(true);
    }

    expect(frameworkMatches('react', HTML_API_FRAMEWORKS)).toBe(false);
  });
});

describe('apiPlatformFrameworks', () => {
  it('expands the html platform to every framework reading that API', () => {
    expect(apiPlatformFrameworks('html')).toEqual(['html', 'vue', 'svelte']);
  });

  it('leaves a platform with its own adapter alone', () => {
    expect(apiPlatformFrameworks('react')).toEqual(['react']);
  });

  it('returns a fresh array rather than the shared constant', () => {
    expect(apiPlatformFrameworks('html')).not.toBe(HTML_API_FRAMEWORKS);
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
    expect(frameworkMatches('vue', ['html', 'vue'])).toBe(true);
  });

  it('does not match an unlisted framework', () => {
    expect(frameworkMatches('html', ['react'])).toBe(false);
    expect(frameworkMatches('vue', ['react'])).toBe(false);
    expect(frameworkMatches('svelte', ['html', 'vue'])).toBe(false);
  });

  it('hides html-only content from the frameworks it leaves out', () => {
    expect(frameworkMatches('vue', ['html'])).toBe(false);
    expect(frameworkMatches('svelte', ['html'])).toBe(false);
  });

  it('ignores the content-framework fallback, which is a display default only', () => {
    expect(resolveContentFramework('vue')).toBe('html');
    expect(frameworkMatches('vue', ['html'])).toBe(false);
  });
});
