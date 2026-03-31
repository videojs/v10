import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyShadowStyles, createShadowStyle, createTemplate, ensureGlobalStyle } from '../shadow-styles';

describe('createShadowStyle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a CSSStyleSheet when constructable stylesheets are available', () => {
    const result = createShadowStyle('div { color: red; }');
    expect(result).toBeInstanceOf(CSSStyleSheet);
  });

  it('returns raw CSS string when CSSStyleSheet is unavailable', () => {
    vi.stubGlobal('CSSStyleSheet', undefined);

    const css = 'div { color: red; }';
    const result = createShadowStyle(css);
    expect(result).toBe(css);
  });
});

describe('applyShadowStyles', () => {
  function createHost(): HTMLElement {
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    return host;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('uses adoptedStyleSheets when supported and all styles are constructable', () => {
    const host = createHost();
    const shadowRoot = host.shadowRoot!;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('div { color: red; }');

    let assigned: CSSStyleSheet[] = [];
    Object.defineProperty(shadowRoot, 'adoptedStyleSheets', {
      get: () => assigned,
      set: (value: CSSStyleSheet[]) => {
        assigned = value;
      },
      configurable: true,
    });

    applyShadowStyles(shadowRoot, [sheet]);
    expect(assigned).toContain(sheet);
    expect(shadowRoot.querySelectorAll('style').length).toBe(0);
  });

  it('falls back to <style> injection for string styles', () => {
    const host = createHost();
    const css = 'div { color: blue; }';

    applyShadowStyles(host.shadowRoot!, [css]);
    const styleEls = host.shadowRoot!.querySelectorAll('style');
    expect(styleEls.length).toBe(1);
    expect(styleEls[0]!.textContent).toBe(css);
  });

  it('falls back to <style> injection when styles are mixed', () => {
    const host = createHost();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('div { color: red; }');
    const css = 'div { color: blue; }';

    applyShadowStyles(host.shadowRoot!, [sheet, css]);
    const styleEls = host.shadowRoot!.querySelectorAll('style');
    expect(styleEls.length).toBe(2);
  });
});

describe('ensureGlobalStyle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.head.innerHTML = '';
  });

  it('injects a <style> tag into document.head', () => {
    ensureGlobalStyle('test-style', 'body { margin: 0; }');

    const el = document.getElementById('test-style');
    expect(el).toBeInstanceOf(HTMLStyleElement);
    expect(el!.textContent).toBe('body { margin: 0; }');
  });

  it('does not duplicate when called twice with the same id', () => {
    ensureGlobalStyle('test-dedup', 'a { color: red; }');
    ensureGlobalStyle('test-dedup', 'a { color: blue; }');

    expect(document.querySelectorAll('#test-dedup').length).toBe(1);
    expect(document.getElementById('test-dedup')!.textContent).toBe('a { color: red; }');
  });

  it('does nothing when document is unavailable', () => {
    vi.stubGlobal('document', undefined);
    expect(() => ensureGlobalStyle('ssr', 'body {}')).not.toThrow();
  });
});

describe('createTemplate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an HTMLTemplateElement with parsed content', () => {
    const template = createTemplate('<div class="root"><span>Hello</span></div>');

    expect(template).toBeInstanceOf(HTMLTemplateElement);
    expect(template!.content.querySelector('.root')).toBeTruthy();
    expect(template!.content.querySelector('span')!.textContent).toBe('Hello');
  });

  it('returns null when document is unavailable', () => {
    vi.stubGlobal('document', undefined);
    expect(createTemplate('<div></div>')).toBeNull();
  });
});
