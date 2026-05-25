import { cleanup, render, screen, waitFor } from '@testing-library/react';
import * as coreI18n from '@videojs/core/i18n';
import { registerI18n, resetI18nRegistryForTesting, type Translations } from '@videojs/core/i18n';
import { createRef, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createI18n } from '../create-i18n';

describe('createI18n', () => {
  afterEach(() => {
    cleanup();
    resetI18nRegistryForTesting();
    document.documentElement.removeAttribute('lang');
    vi.restoreAllMocks();
  });

  it('uses explicit locale for translations', async () => {
    registerI18n('fr', { play: 'Lire' });
    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider locale="fr">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });
  });

  it('merges translations prop above registry and lazy built-ins', async () => {
    registerI18n('en', { play: 'Registry', pause: 'RegistryPause' });
    const { I18nProvider, useTranslator } = createI18n({
      loadLocale: async (tag) =>
        tag === 'en'
          ? {
              play: 'Lazy',
              replay: 'LazyReplay',
            }
          : undefined,
    });

    function Probe(): ReactElement {
      const t = useTranslator();
      return (
        <span>
          {t('play')}:{t('pause')}:{t('replay')}
        </span>
      );
    }

    render(
      <I18nProvider locale="en" translations={{ play: 'Prop' }}>
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Prop:RegistryPause:LazyReplay')).not.toBeNull();
    });
  });

  it('inherits nearest ancestor lang (including html)', async () => {
    registerI18n('de', { play: 'Los' });
    document.documentElement.lang = 'de';

    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Los')).not.toBeNull();
    });
  });

  it('updates ambient locale when subtree moves change which ancestor supplies lang', async () => {
    registerI18n('de', { play: 'Los' });
    registerI18n('fr', { play: 'Lire' });
    document.documentElement.setAttribute('lang', 'fr');

    const rootRef = createRef<HTMLDivElement>();
    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    const { rerender } = render(
      <div ref={rootRef}>
        <I18nProvider langRootRef={rootRef}>
          <Probe />
        </I18nProvider>
      </div>
    );

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });

    rerender(
      <section lang="de">
        <div ref={rootRef}>
          <I18nProvider langRootRef={rootRef}>
            <Probe />
          </I18nProvider>
        </div>
      </section>
    );

    await waitFor(() => {
      expect(screen.queryByText('Los')).not.toBeNull();
    });
  });

  it('does not inherit html lang before langRootRef attaches', async () => {
    registerI18n('de', { play: 'Los' });
    registerI18n('fr', { play: 'Lire' });
    document.documentElement.setAttribute('lang', 'de');

    const rootRef = createRef<HTMLDivElement>();
    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <section lang="fr">
        <I18nProvider langRootRef={rootRef}>
          <div ref={rootRef}>
            <Probe />
          </div>
        </I18nProvider>
      </section>
    );

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });
    expect(screen.queryByText('Los')).toBeNull();
  });

  it('prefers the closest lang attribute over html lang', async () => {
    registerI18n('de', { play: 'Los' });
    registerI18n('fr', { play: 'Lire' });
    document.documentElement.setAttribute('lang', 'de');

    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    const sectionRef = createRef<HTMLElement>();

    render(
      <section ref={sectionRef} lang="fr">
        <I18nProvider langRootRef={sectionRef}>
          <Probe />
        </I18nProvider>
      </section>
    );

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });
  });

  it('updates when html lang changes', async () => {
    registerI18n('de', { play: 'Los' });
    registerI18n('fr', { play: 'Lire' });
    document.documentElement.lang = 'de';

    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Los')).not.toBeNull();
    });

    document.documentElement.setAttribute('lang', 'fr');

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });
  });

  it('refreshes merged translations when the registry updates after mount', async () => {
    registerI18n('en', { play: 'First' });
    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('First')).not.toBeNull();
    });

    registerI18n('en', { play: 'Second' });

    await waitFor(() => {
      expect(screen.queryByText('Second')).not.toBeNull();
    });
  });

  it('drops lazy builtin overlay from the prior locale while the next locale is loading', async () => {
    registerI18n('en', { play: 'EnReg' });
    registerI18n('fr', { play: 'FrReg' });

    let unblockFr!: () => void;
    const frBlocked = new Promise<void>((resolve) => {
      unblockFr = resolve;
    });

    const { I18nProvider, useTranslator } = createI18n({
      loadLocale: async (tag) => {
        if (tag === 'en') {
          return { play: 'EnLazy' };
        }
        if (tag === 'fr') {
          await frBlocked;
          return { play: 'FrLazy' };
        }
        return undefined;
      },
    });

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    const { rerender } = render(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('EnLazy')).not.toBeNull();
    });

    rerender(
      <I18nProvider locale="fr">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('FrReg')).not.toBeNull();
    });
    expect(screen.queryByText('EnLazy')).toBeNull();

    unblockFr();

    await waitFor(() => {
      expect(screen.queryByText('FrLazy')).not.toBeNull();
    });
  });

  it('loads built-ins for unregistered locales via lazy loader', async () => {
    const { I18nProvider, useTranslator } = createI18n({
      loadLocale: async (tag) => (tag === 'xx' ? { play: 'BuiltinXX' } : undefined),
    });

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider locale="xx">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('BuiltinXX')).not.toBeNull();
    });
  });

  it('useLocale reflects resolved locale', async () => {
    const { I18nProvider, useLocale } = createI18n();
    document.documentElement.lang = 'es-MX';

    function Probe(): ReactElement {
      return <span>{useLocale()}</span>;
    }

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('es-MX')).not.toBeNull();
    });
  });

  it('does not apply stale lazy locale overlays after locale switch', async () => {
    let resolveDe: ((value: Partial<Translations>) => void) | undefined;
    const deLoad = new Promise<Partial<Translations>>((resolve) => {
      resolveDe = resolve;
    });

    const { I18nProvider, useTranslator } = createI18n({
      loadLocale: async (tag) => {
        if (tag === 'de') {
          return deLoad;
        }
        if (tag === 'fr') {
          return { play: 'Lecture' };
        }
        return undefined;
      },
    });

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    const { rerender } = render(
      <I18nProvider locale="de">
        <Probe />
      </I18nProvider>
    );

    rerender(
      <I18nProvider locale="fr">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Lecture')).not.toBeNull();
    });

    resolveDe?.({ play: 'Abspielen' });

    await waitFor(() => {
      expect(screen.queryByText('Abspielen')).toBeNull();
      expect(screen.queryByText('Lecture')).not.toBeNull();
    });
  });

  it('does not re-notify onActiveLocaleChange when the handler identity changes', async () => {
    registerI18n('de', { play: 'Los' });
    document.documentElement.lang = 'de';

    const onActiveLocaleChange = vi.fn();
    const { I18nProvider } = createI18n();

    function Probe(): ReactElement {
      return <span>x</span>;
    }

    const { rerender } = render(
      <I18nProvider onActiveLocaleChange={onActiveLocaleChange}>
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(onActiveLocaleChange).toHaveBeenCalledWith('de');
    });

    const callCountAfterMount = onActiveLocaleChange.mock.calls.length;

    rerender(
      <I18nProvider onActiveLocaleChange={() => {}}>
        <Probe />
      </I18nProvider>
    );

    expect(onActiveLocaleChange.mock.calls.length).toBe(callCountAfterMount);
  });

  it('notifies onActiveLocaleChange when resolved locale changes', async () => {
    const onActiveLocaleChange = vi.fn();
    registerI18n('de', { play: 'Los' });
    document.documentElement.lang = 'de';

    const { I18nProvider } = createI18n();

    function Probe(): ReactElement {
      return <span>x</span>;
    }

    render(
      <I18nProvider onActiveLocaleChange={onActiveLocaleChange}>
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(onActiveLocaleChange.mock.calls.some((c) => c[0] === 'de')).toBe(true);
    });

    document.documentElement.setAttribute('lang', 'fr');

    await waitFor(() => {
      expect(onActiveLocaleChange.mock.calls.some((c) => c[0] === 'fr')).toBe(true);
    });
  });

  it('useTranslator falls back to English outside a provider', () => {
    const { useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(<Probe />);
    expect(screen.queryByText('Play')).not.toBeNull();
  });

  it('refreshes fallback translator when the registry updates outside a provider', async () => {
    const { useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(<Probe />);
    expect(screen.queryByText('Play')).not.toBeNull();

    registerI18n('en', { play: 'RegistryPlay' });

    await waitFor(() => {
      expect(screen.queryByText('RegistryPlay')).not.toBeNull();
    });
  });

  it('ignores rejected built-in locale loads', async () => {
    registerI18n('de', { play: 'RegistryPlay' });
    const { I18nProvider, useTranslator } = createI18n({
      loadLocale: async () => {
        throw new Error('load failed');
      },
    });

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider locale="de">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('RegistryPlay')).not.toBeNull();
    });
  });

  it('does not loop when langRootRef identity changes each render', async () => {
    registerI18n('fr', { play: 'Lire' });
    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    function Shell(): ReactElement {
      const rootRef = createRef<HTMLDivElement>();
      return (
        <section lang="fr">
          <I18nProvider langRootRef={rootRef}>
            <div ref={rootRef}>
              <Probe />
            </div>
          </I18nProvider>
        </section>
      );
    }

    const { rerender } = render(<Shell />);

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });

    for (let i = 0; i < 20; i++) {
      rerender(<Shell />);
    }

    expect(screen.queryByText('Lire')).not.toBeNull();
  });

  it('registers browser translations when no locale pack exists', async () => {
    const getBrowserTranslations = vi.spyOn(coreI18n, 'getBrowserTranslations').mockResolvedValue({
      play: 'BrowserPlay',
    } satisfies Partial<Translations>);

    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider locale="xx">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('BrowserPlay')).not.toBeNull();
    });
    expect(getBrowserTranslations).toHaveBeenCalledWith('xx');
  });

  it('skips browser translation when locale is already registered', async () => {
    registerI18n('fr', { play: 'Lire' });
    const getBrowserTranslations = vi.spyOn(coreI18n, 'getBrowserTranslations');

    const { I18nProvider, useTranslator } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      return <span>{t('play')}</span>;
    }

    render(
      <I18nProvider locale="fr">
        <Probe />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Lire')).not.toBeNull();
    });
    expect(getBrowserTranslations).not.toHaveBeenCalled();
  });

  it('does not register browser translations after locale changes', async () => {
    let resolveBrowser: ((value: Partial<Translations>) => void) | undefined;
    const getBrowserTranslations = vi.spyOn(coreI18n, 'getBrowserTranslations').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBrowser = resolve;
        })
    );
    const registerI18nSpy = vi.spyOn(coreI18n, 'registerI18n');

    const { I18nProvider } = createI18n();

    const { rerender } = render(<I18nProvider locale="xx">{null}</I18nProvider>);

    await waitFor(() => {
      expect(getBrowserTranslations).toHaveBeenCalledWith('xx');
    });

    rerender(<I18nProvider locale="fr">{null}</I18nProvider>);
    await Promise.resolve();

    resolveBrowser?.({ play: 'StaleBrowserPlay' });
    await Promise.resolve();
    await Promise.resolve();

    expect(registerI18nSpy).not.toHaveBeenCalledWith('xx', { play: 'StaleBrowserPlay' });
  });

  it('inherits ancestor locale when a nested provider only overrides translations', async () => {
    registerI18n('de', { play: 'Abspielen', pause: 'Pause' });

    const { I18nProvider, useTranslator, useLocale } = createI18n();

    function Probe(): ReactElement {
      const t = useTranslator();
      const locale = useLocale();
      return (
        <span>
          {locale}:{t('play')}:{t('pause')}
        </span>
      );
    }

    render(
      <I18nProvider locale="de">
        <I18nProvider translations={{ play: 'Override' }}>
          <Probe />
        </I18nProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('de:Override:Pause')).not.toBeNull();
    });
  });

  it('passes through when a nested provider only supplies langRootRef', async () => {
    registerI18n('de', { play: 'Abspielen' });

    const { I18nProvider, useTranslator } = createI18n();
    const rootRef = createRef<HTMLDivElement>();

    function Probe(): ReactElement {
      return <span>{useTranslator()('play')}</span>;
    }

    render(
      <I18nProvider locale="de">
        <I18nProvider langRootRef={rootRef}>
          <div ref={rootRef}>
            <Probe />
          </div>
        </I18nProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Abspielen')).not.toBeNull();
    });
  });
});
