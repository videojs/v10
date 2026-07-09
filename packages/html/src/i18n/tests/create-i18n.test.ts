import * as coreI18n from '@videojs/core/i18n';
import { registerI18n, resetBrowserTranslationCacheForTesting, resetI18nRegistry } from '@videojs/core/i18n';
import { ReactiveElement } from '@videojs/element';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createI18n } from '../../i18n/create-i18n';
import { MediaI18nProviderElement, MediaTextElement } from '../../i18n/index';

describe('createI18n (HTML)', () => {
  afterEach(async () => {
    resetI18nRegistry();
    resetBrowserTranslationCacheForTesting();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('lang');
    await Promise.resolve();
    await Promise.resolve();
    vi.restoreAllMocks();
  });

  it('media-i18n uses explicit lang for registry copy', async () => {
    registerI18n('fr', { Play: 'Lire' });
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'fr');
    document.body.appendChild(provider);
    await Promise.resolve();
    expect(provider.getAttribute('lang')).toBe('fr');
  });

  it('media-text translates text content inside provider', async () => {
    registerI18n('de', { Play: 'Los' });
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'de');
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(text.textContent).toBe('Los');
  });

  it('media-text keeps text content when no translation exists', async () => {
    const text = new MediaTextElement();
    text.textContent = 'Fallback label';
    document.body.appendChild(text);
    await text.updateComplete;
    expect(text.textContent).toBe('Fallback label');
  });

  it('media-text stores source text before translating', async () => {
    registerI18n('de', { Play: 'Los' });
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'de');
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await text.updateComplete;
    expect(text.textContent).toBe('Los');
  });

  it('media-text falls back to text content when phrase is missing', async () => {
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'de');
    const text = new MediaTextElement();
    text.textContent = 'Fallback label';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await text.updateComplete;
    expect(text.textContent).toBe('Fallback label');
  });

  it('media-text falls back to text content without a provider', async () => {
    const text = new MediaTextElement();
    text.textContent = 'Fallback label';
    document.body.appendChild(text);
    await text.updateComplete;
    expect(text.textContent).toBe('Fallback label');
  });

  it('media-text is empty without text content', async () => {
    const text = new MediaTextElement();
    document.body.appendChild(text);
    await text.updateComplete;
    expect(text.textContent).toBe('');
  });

  it('inherits ambient html lang when provider has no lang', async () => {
    registerI18n('es', { Play: 'Ir' });
    document.documentElement.lang = 'es';
    const provider = new MediaI18nProviderElement();
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(text.textContent).toBe('Ir');
  });

  it('updates media-text when html lang changes', async () => {
    registerI18n('x-test-de', { Play: 'Los' });
    registerI18n('x-test-fr', { Play: 'Lire' });
    document.documentElement.lang = 'x-test-de';
    const provider = new MediaI18nProviderElement();
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await vi.waitFor(() => {
      expect(text.textContent).toBe('Los');
    });
    document.documentElement.lang = 'x-test-fr';
    await vi.waitFor(() => {
      expect(text.textContent).toBe('Lire');
    });
  });

  it('reloads builtin lazy overlays when ambient html lang changes', async () => {
    const { ProviderMixin, TextMixin } = createI18n({
      loader: async (tag) => {
        if (tag === 'x-test-lazy-de') return { Play: 'BuiltinDe' };
        if (tag === 'x-test-lazy-fr') return { Play: 'BuiltinFr' };
        return undefined;
      },
    });
    class LazyAmbientProvider extends ProviderMixin(ReactiveElement) {}
    class LazyAmbientText extends TextMixin(ReactiveElement) {}
    customElements.define('i18n-lazy-ambient-provider', LazyAmbientProvider);
    customElements.define('i18n-lazy-ambient-text', LazyAmbientText);

    document.documentElement.lang = 'x-test-lazy-de';
    const provider = new LazyAmbientProvider();
    const text = new LazyAmbientText();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await vi.waitFor(() => {
      expect(text.textContent).toBe('BuiltinDe');
    });

    document.documentElement.lang = 'x-test-lazy-fr';
    await vi.waitFor(() => {
      expect(text.textContent).toBe('BuiltinFr');
    });
  });

  it('updates media-text when provider lang changes', async () => {
    registerI18n('de', { Play: 'Los' });
    registerI18n('fr', { Play: 'Lire' });
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'de');
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    await vi.waitFor(() => {
      expect(text.textContent).toBe('Los');
    });
    provider.setAttribute('lang', 'fr');
    await vi.waitFor(() => {
      expect(text.textContent).toBe('Lire');
    });
  });

  it('discards stale builtin load when provider lang is set right after insert', async () => {
    const { ProviderMixin, TextMixin } = createI18n({
      loader: async (tag) => {
        if (tag === 'en') return { Play: 'BuiltinEn' };
        if (tag === 'de') return { Play: 'BuiltinDe' };
        return undefined;
      },
    });
    class DriftProvider extends ProviderMixin(ReactiveElement) {}
    class DriftText extends TextMixin(ReactiveElement) {}
    customElements.define('i18n-drift-p', DriftProvider);
    customElements.define('i18n-drift-t', DriftText);

    document.documentElement.lang = 'en';
    const provider = new DriftProvider();
    const text = new DriftText();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);
    provider.setAttribute('lang', 'de');
    await vi.waitFor(() => {
      expect(text.textContent).toBe('BuiltinDe');
    });
  });

  it('shares Lit i18n context between createI18n() factories', async () => {
    registerI18n('de', { Play: 'Los' });
    const { ProviderMixin: AProvider, TextMixin: AText } = createI18n();
    const { TextMixin: BText } = createI18n();
    class SharedProvider extends AProvider(ReactiveElement) {}
    class SharedTextA extends AText(ReactiveElement) {}
    class SharedTextB extends BText(ReactiveElement) {}
    customElements.define('i18n-shared-provider', SharedProvider);
    customElements.define('i18n-shared-text-a', SharedTextA);
    customElements.define('i18n-shared-text-b', SharedTextB);

    const provider = new SharedProvider();
    provider.setAttribute('lang', 'de');
    const textSame = new SharedTextA();
    const textOther = new SharedTextB();
    textSame.textContent = 'Play';
    textOther.textContent = 'Play';
    provider.appendChild(textSame);
    provider.appendChild(textOther);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(textSame.textContent).toBe('Los');
    expect(textOther.textContent).toBe('Los');
  });

  it('I18nController falls back to English without provider', async () => {
    const { context, I18nController: Ctor } = createI18n();
    class Probe extends ReactiveElement {
      readonly #i18n = new Ctor(this, context);
      override connectedCallback(): void {
        super.connectedCallback();
        this.textContent = this.#i18n.value('Play');
      }
    }
    customElements.define('i18n-probe-fallback', Probe);
    const el = new Probe();
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.textContent).toBe('Play');
  });

  it('I18nController refreshes fallback English when the registry changes', async () => {
    const { context, I18nController: Ctor } = createI18n();
    class Probe extends ReactiveElement {
      readonly #i18n = new Ctor(this, context);
      protected override updated(): void {
        this.textContent = this.#i18n.value('Play');
      }
    }
    customElements.define('i18n-probe-fallback-registry', Probe);
    const el = new Probe();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.textContent).toBe('Play');

    registerI18n('en', { Play: 'RegistryPlay' });

    await vi.waitFor(() => {
      expect(el.textContent).toBe('RegistryPlay');
    });
  });

  it('I18nController keeps fallback translator stable until the registry changes', async () => {
    const { context, I18nController: Ctor } = createI18n();
    class Probe extends ReactiveElement {
      readonly i18n = new Ctor(this, context);
    }
    customElements.define('i18n-probe-fallback-stability', Probe);
    const el = new Probe();
    document.body.appendChild(el);
    await el.updateComplete;

    const first = el.i18n.value;
    const second = el.i18n.value;
    expect(second).toBe(first);

    registerI18n('en', { Play: 'RegistryPlay' });
    await el.updateComplete;

    const third = el.i18n.value;
    expect(third).not.toBe(first);
    expect(third('Play')).toBe('RegistryPlay');
  });

  it('provider keeps translator stable across unrelated updates', async () => {
    registerI18n('x-stable', { Play: 'StablePlay' });
    const {
      context,
      I18nController: Ctor,
      ProviderMixin,
    } = createI18n({
      loader: async (tag) => (tag === 'x-stable' ? { Pause: 'LazyPause' } : undefined),
    });
    class StableProvider extends ProviderMixin(ReactiveElement) {}
    class Probe extends ReactiveElement {
      readonly i18n = new Ctor(this, context);
    }
    customElements.define('i18n-stable-provider', StableProvider);
    customElements.define('i18n-stable-provider-probe', Probe);
    const provider = new StableProvider();
    const probe = new Probe();
    provider.setAttribute('lang', 'x-stable');
    provider.appendChild(probe);
    document.body.appendChild(provider);

    await vi.waitFor(() => {
      expect(probe.i18n.value('Pause')).toBe('LazyPause');
    });

    const first = probe.i18n.value;
    provider.requestUpdate();
    await provider.updateComplete;
    await probe.updateComplete;

    expect(probe.i18n.value).toBe(first);

    registerI18n('x-stable', { Replay: 'StableReplay' });

    await vi.waitFor(() => {
      expect(probe.i18n.value).not.toBe(first);
      expect(probe.i18n.value('Replay')).toBe('StableReplay');
    });
  });

  it('media-text refreshes fallback English without a provider when the registry changes', async () => {
    const text = new MediaTextElement();
    text.textContent = 'Play';
    document.body.appendChild(text);
    await text.updateComplete;
    expect(text.textContent).toBe('Play');

    registerI18n('en', { Play: 'RegistryPlay' });

    await vi.waitFor(() => {
      expect(text.textContent).toBe('RegistryPlay');
    });
  });

  it('registers browser translations when no locale pack exists', async () => {
    vi.spyOn(coreI18n, 'getBrowserTranslations').mockResolvedValue({ Play: 'BrowserPlay' });

    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'xx');
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);

    await vi.waitFor(() => {
      expect(text.textContent).toBe('BrowserPlay');
    });
  });

  it('skips browser translation when locale is already registered', async () => {
    registerI18n('fr', { Play: 'Lire' });
    const getBrowserTranslations = vi.spyOn(coreI18n, 'getBrowserTranslations');

    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'fr');
    const text = new MediaTextElement();
    text.textContent = 'Play';
    provider.appendChild(text);
    document.body.appendChild(provider);

    await vi.waitFor(() => {
      expect(text.textContent).toBe('Lire');
    });
    expect(getBrowserTranslations).not.toHaveBeenCalled();
  });

  it('registers browser translations when a shipped locale pack is missing keys', async () => {
    const getBrowserTranslations = vi.spyOn(coreI18n, 'getBrowserTranslations').mockResolvedValue({
      Settings: 'Paramètres',
    } satisfies Partial<coreI18n.Translations>);

    const { ProviderMixin, TextMixin } = createI18n({
      loader: async (tag) => (tag === 'fr' ? { Play: 'Lire' } : undefined),
    });
    class PartialProvider extends ProviderMixin(ReactiveElement) {}
    class PartialText extends TextMixin(ReactiveElement) {}
    customElements.define('i18n-partial-provider', PartialProvider);
    customElements.define('i18n-partial-text', PartialText);

    const provider = new PartialProvider();
    provider.setAttribute('lang', 'fr');
    const text = new PartialText();
    text.textContent = 'Settings';
    provider.appendChild(text);
    document.body.appendChild(provider);

    await vi.waitFor(() => {
      expect(text.textContent).toBe('Paramètres');
    });
    expect(getBrowserTranslations).toHaveBeenCalledWith('fr');
  });

  it('does not register browser translations after locale changes', async () => {
    let resolveBrowser: ((value: Partial<coreI18n.Translations>) => void) | undefined;
    const getBrowserTranslations = vi.spyOn(coreI18n, 'getBrowserTranslations').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBrowser = resolve;
        })
    );
    const registerI18nSpy = vi.spyOn(coreI18n, 'registerI18n');

    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'xx');
    document.body.appendChild(provider);

    await vi.waitFor(() => {
      expect(getBrowserTranslations).toHaveBeenCalledWith('xx');
    });

    provider.setAttribute('lang', 'fr');
    await Promise.resolve();

    resolveBrowser?.({ Play: 'StaleBrowserPlay' });
    await Promise.resolve();
    await Promise.resolve();

    expect(registerI18nSpy).not.toHaveBeenCalledWith('xx', { Play: 'StaleBrowserPlay' });
  });
});
