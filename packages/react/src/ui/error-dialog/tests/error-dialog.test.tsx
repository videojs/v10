import { cleanup, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { ErrorDialog } from '..';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

describe('ErrorDialog', () => {
  it('shows translated title, description, and dismiss label when locale is es', () => {
    registerI18n('es', {
      'Something went wrong.': 'Algo salió mal.',
      OK: 'Aceptar',
      'A network error caused the media download to fail.': 'Error de red.',
      'An error occurred. Please try again.': 'Ocurrió un error. Inténtalo de nuevo.',
    });

    const error = {
      code: 2,
      message: 'A network error caused the media download to fail.',
    };
    const { Wrapper } = createPlayerWrapper({
      error,
      dismissError: vi.fn(),
    });

    render(
      <Wrapper>
        <I18nProvider locale="es">
          <ErrorDialog.Root>
            <ErrorDialog.Popup>
              <ErrorDialog.Title data-testid="title" />
              <ErrorDialog.Description data-testid="description" />
              <ErrorDialog.Close data-testid="close" />
            </ErrorDialog.Popup>
          </ErrorDialog.Root>
        </I18nProvider>
      </Wrapper>
    );

    expect(screen.getByTestId('title').textContent).toBe('Algo salió mal.');
    expect(screen.getByTestId('description').textContent).toBe('Error de red.');
    expect(screen.getByTestId('close').textContent).toBe('Aceptar');
  });
});
