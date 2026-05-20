import { cleanup, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistryForTesting } from '@videojs/core/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { PlayButton } from '../play-button';

afterEach(() => {
  resetI18nRegistryForTesting();
  cleanup();
});

describe('PlayButton', () => {
  it('applies translated aria-label and updates when locale changes', () => {
    registerI18n('es', { play: 'Reproducir' });
    registerI18n('fr', { play: 'Lire' });

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
});
