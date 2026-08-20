import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { ControlsRoot } from '../controls-root';

describe('ControlsRoot', () => {
  it('marks the controls surface as interactive', () => {
    const { Wrapper } = createPlayerWrapper({
      controlsVisible: true,
      userActive: true,
    });
    const { getByTestId } = render(<ControlsRoot data-testid="controls" />, { wrapper: Wrapper });

    expect(getByTestId('controls').hasAttribute('data-interactive')).toBe(true);
  });
});
