import { cleanup, render, screen } from '@testing-library/react';
import { PlayButtonCore } from '@videojs/core';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { isString } from '@videojs/utils/predicate';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createI18n, I18nProvider } from '../../../i18n';
import { createPlayerWrapper, MockErrorBoundary } from '../../../testing/mocks';
import { PlayButton } from '../play-button';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

describe('PlayButton', () => {
  it('applies translated aria-label and updates when locale changes', () => {
    registerI18n('es', { 'buttons.play': 'Reproducir' });
    registerI18n('fr', { 'buttons.play': 'Lire' });

    const { Wrapper } = createPlayerWrapper({
      paused: true,
      ended: false,
      started: false,
      waiting: false,
      play: vi.fn(),
      pause: vi.fn(),
      togglePaused: vi.fn(),
    });

    const { rerender } = render(
      <Wrapper>
        <I18nProvider locale="es">
          <PlayButton data-testid="play" />
        </I18nProvider>
      </Wrapper>
    );

    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('Reproducir');

    rerender(
      <Wrapper>
        <I18nProvider locale="fr">
          <PlayButton data-testid="play" />
        </I18nProvider>
      </Wrapper>
    );

    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('Lire');
  });

  it('uses translations from a createI18n provider', () => {
    const { I18nProvider: CustomI18nProvider } = createI18n();

    const { Wrapper } = createPlayerWrapper({
      paused: true,
      ended: false,
      started: false,
      waiting: false,
      play: vi.fn(),
      pause: vi.fn(),
      togglePaused: vi.fn(),
    });

    render(
      <Wrapper>
        <CustomI18nProvider locale="en" translations={{ 'buttons.play': 'Custom play' }}>
          <PlayButton data-testid="play" />
        </CustomI18nProvider>
      </Wrapper>
    );

    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('Custom play');
  });

  it('projects each render onto its own core so an abandoned render cannot mutate the committed one', () => {
    const cores = new Map<string, PlayButtonCore>();
    const originalSetProps = PlayButtonCore.prototype.setProps;
    const setProps = vi
      .spyOn(PlayButtonCore.prototype, 'setProps')
      .mockImplementation(function (this: PlayButtonCore, props) {
        if (isString(props.label)) cores.set(props.label, this);

        originalSetProps.call(this, props);
      });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Wrapper } = createPlayerWrapper({
      paused: true,
      ended: false,
      started: false,
      waiting: false,
      play: vi.fn(),
      pause: vi.fn(),
      togglePaused: vi.fn(),
    });

    function Thrower({ abandon }: { abandon: boolean }): ReactNode {
      if (abandon) throw new Error('abandon render');

      return null;
    }

    const { rerender } = render(
      <Wrapper>
        <MockErrorBoundary>
          <PlayButton label="committed" />
          <Thrower abandon={false} />
        </MockErrorBoundary>
      </Wrapper>
    );

    rerender(
      <Wrapper>
        <MockErrorBoundary>
          <PlayButton label="abandoned" />
          <Thrower abandon />
        </MockErrorBoundary>
      </Wrapper>
    );

    expect(cores.get('committed')).toBeInstanceOf(PlayButtonCore);
    expect(cores.get('abandoned')).toBeInstanceOf(PlayButtonCore);
    expect(cores.get('abandoned')).not.toBe(cores.get('committed'));
    setProps.mockRestore();
    consoleError.mockRestore();
  });
});
