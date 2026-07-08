import { cleanup, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createI18n, I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { PlayButton } from '../play-button';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

describe('PlayButton', () => {
  it('applies translated aria-label and updates when locale changes', () => {
    registerI18n('es', { Play: 'Reproducir' });
    registerI18n('fr', { Play: 'Lire' });

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
        <CustomI18nProvider locale="en" translations={{ Play: 'Custom play' }}>
          <PlayButton data-testid="play" />
        </CustomI18nProvider>
      </Wrapper>
    );

    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('Custom play');
  });
});
