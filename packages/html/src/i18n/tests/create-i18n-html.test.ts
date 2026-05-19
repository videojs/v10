import type { AnyPlayerStore } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistryForTesting } from '@videojs/core/i18n';
import { ReactiveElement } from '@videojs/element';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../define/i18n';
import { createI18n } from '../../i18n/create-i18n';
import { MediaI18nProviderElement, MediaTextElement } from '../../i18n/index';
import { selectCaptionsByLocale } from '../select-captions-by-locale';

describe('createI18n (HTML)', () => {
  afterEach(() => {
    resetI18nRegistryForTesting();
    document.documentElement.removeAttribute('lang');
  });

  it('media-i18n-provider uses explicit lang for registry copy', async () => {
    registerI18n('fr', { play: 'Lire' });
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'fr');
    document.body.appendChild(provider);
    await Promise.resolve();
    expect(provider.getAttribute('lang')).toBe('fr');
  });

  it('media-text shows translation key inside provider', async () => {
    registerI18n('de', { play: 'Los' });
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'de');
    const text = new MediaTextElement();
    text.setAttribute('key', 'play');
    provider.appendChild(text);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(text.textContent).toBe('Los');
  });

  it('inherits ambient html lang when provider has no lang', async () => {
    registerI18n('es', { play: 'Ir' });
    document.documentElement.lang = 'es';
    const provider = new MediaI18nProviderElement();
    const text = new MediaTextElement();
    text.setAttribute('key', 'play');
    provider.appendChild(text);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(text.textContent).toBe('Ir');
  });

  it('updates media-text when html lang changes', async () => {
    registerI18n('de', { play: 'Los' });
    registerI18n('fr', { play: 'Lire' });
    document.documentElement.lang = 'de';
    const provider = new MediaI18nProviderElement();
    const text = new MediaTextElement();
    text.setAttribute('key', 'play');
    provider.appendChild(text);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(text.textContent).toBe('Los');
    document.documentElement.lang = 'fr';
    await vi.waitFor(() => {
      expect(text.textContent).toBe('Lire');
    });
  });

  it('reloads builtin lazy overlays when ambient html lang changes', async () => {
    const { ProviderMixin, TextMixin } = createI18n({
      loadBuiltinLocale: async (tag) => {
        if (tag === 'de') return { play: 'BuiltinDe' };
        if (tag === 'fr') return { play: 'BuiltinFr' };
        return undefined;
      },
    });
    class LazyAmbientProvider extends ProviderMixin(ReactiveElement) {}
    class LazyAmbientText extends TextMixin(ReactiveElement) {}
    customElements.define('i18n-lazy-ambient-provider', LazyAmbientProvider);
    customElements.define('i18n-lazy-ambient-text', LazyAmbientText);

    document.documentElement.lang = 'de';
    const provider = new LazyAmbientProvider();
    const text = new LazyAmbientText();
    text.setAttribute('key', 'play');
    provider.appendChild(text);
    document.body.appendChild(provider);
    await vi.waitFor(() => {
      expect(text.textContent).toBe('BuiltinDe');
    });

    document.documentElement.lang = 'fr';
    await vi.waitFor(() => {
      expect(text.textContent).toBe('BuiltinFr');
    });
  });

  it('discards stale builtin load when provider lang is set right after insert', async () => {
    const { ProviderMixin, TextMixin } = createI18n({
      loadBuiltinLocale: async (tag) => {
        if (tag === 'en') return { play: 'BuiltinEn' };
        if (tag === 'de') return { play: 'BuiltinDe' };
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
    text.setAttribute('key', 'play');
    provider.appendChild(text);
    document.body.appendChild(provider);
    provider.setAttribute('lang', 'de');
    await vi.waitFor(() => {
      expect(text.textContent).toBe('BuiltinDe');
    });
  });

  it('isolates Lit i18n context between createI18n() factories', async () => {
    registerI18n('de', { play: 'Los' });
    const { ProviderMixin: AProvider, TextMixin: AText } = createI18n();
    const { TextMixin: BText } = createI18n();
    class IsoProvider extends AProvider(ReactiveElement) {}
    class IsoTextA extends AText(ReactiveElement) {}
    class IsoTextB extends BText(ReactiveElement) {}
    customElements.define('i18n-iso-provider', IsoProvider);
    customElements.define('i18n-iso-text-a', IsoTextA);
    customElements.define('i18n-iso-text-b', IsoTextB);

    const provider = new IsoProvider();
    provider.setAttribute('lang', 'de');
    const textSame = new IsoTextA();
    const textOther = new IsoTextB();
    textSame.setAttribute('key', 'play');
    textOther.setAttribute('key', 'play');
    provider.appendChild(textSame);
    provider.appendChild(textOther);
    document.body.appendChild(provider);
    await Promise.resolve();
    await Promise.resolve();
    expect(textSame.textContent).toBe('Los');
    expect(textOther.textContent).toBe('Play');
  });

  it('I18nController falls back to English without provider', async () => {
    const { I18nController: Ctor } = createI18n();
    class Probe extends ReactiveElement {
      readonly #i18n = new Ctor(this);
      override connectedCallback(): void {
        super.connectedCallback();
        this.textContent = this.#i18n.value('play');
      }
    }
    customElements.define('i18n-probe-fallback', Probe);
    const el = new Probe();
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.textContent).toBe('Play');
  });

  it('selectCaptionsByLocale activates a matching text track', () => {
    const video = document.createElement('video');
    video.addTextTrack('subtitles', 'DE', 'de');
    video.addTextTrack('subtitles', 'FR', 'fr');

    document.body.appendChild(video);

    selectCaptionsByLocale({ target: { media: video, container: null } } as AnyPlayerStore, 'fr');

    const frTrack = [...video.textTracks].find((t) => t.language === 'fr');
    expect(frTrack?.mode).toBe('showing');
  });
});
