import { afterEach, describe, expect, it } from 'vitest';
import { hasScript, loadScript } from '../script';

function getScript(src: string) {
  return document.head.querySelector(`script[src="${src}"]`);
}

afterEach(() => {
  document.head.innerHTML = '';
});

describe('loadScript', () => {
  it('appends a script tag and resolves on load', async () => {
    const src = 'https://example.com/load.js';
    const promise = loadScript(src);

    const script = getScript(src);
    expect(script).not.toBeNull();

    script!.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('shares a single promise for concurrent calls', () => {
    const src = 'https://example.com/concurrent.js';
    const first = loadScript(src);
    const second = loadScript(src);

    expect(first).toBe(second);
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);

    getScript(src)!.dispatchEvent(new Event('load'));
  });

  it('reuses the cached promise after a successful load', async () => {
    const src = 'https://example.com/cached.js';
    const first = loadScript(src);
    getScript(src)!.dispatchEvent(new Event('load'));
    await first;

    expect(loadScript(src)).toBe(first);
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
  });

  it('rejects with an error, removes the tag, and allows a retry', async () => {
    const src = 'https://example.com/fail.js';
    const first = loadScript(src);

    getScript(src)!.dispatchEvent(new Event('error'));

    await expect(first).rejects.toThrowError(`Failed to load script: ${src}`);
    expect(getScript(src)).toBeNull();

    const retry = loadScript(src);
    expect(retry).not.toBe(first);
    expect(getScript(src)).not.toBeNull();

    getScript(src)!.dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBeUndefined();
  });

  it('resolves without adding a tag when the script already exists', async () => {
    const src = 'https://example.com/existing.js';
    const script = document.createElement('script');
    script.setAttribute('src', src);
    document.head.appendChild(script);

    await expect(loadScript(src)).resolves.toBeUndefined();
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
  });
});

describe('hasScript', () => {
  it('matches scripts by their src attribute', () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'https://example.com/has.js');
    document.head.appendChild(script);

    expect(hasScript('https://example.com/has.js')).toBe(true);
    expect(hasScript('https://example.com/other.js')).toBe(false);
  });
});
