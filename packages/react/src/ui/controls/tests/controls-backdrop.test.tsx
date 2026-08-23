import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { ControlsBackdrop } from '../controls-backdrop';
import { ControlsRoot } from '../controls-root';

describe('ControlsBackdrop', () => {
  it('is presentational and receives controls state attributes', () => {
    const { Wrapper } = createPlayerWrapper({
      controlsVisible: true,
      userActive: true,
    });
    const { getByTestId } = render(
      <ControlsRoot>
        <ControlsBackdrop data-testid="backdrop" />
      </ControlsRoot>,
      { wrapper: Wrapper }
    );

    const backdrop = getByTestId('backdrop');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    expect(backdrop.hasAttribute('data-visible')).toBe(true);
    expect(backdrop.hasAttribute('data-user-active')).toBe(true);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const { Wrapper } = createPlayerWrapper({
      controlsVisible: true,
      userActive: true,
    });

    render(
      <ControlsRoot>
        <ControlsBackdrop ref={ref} />
      </ControlsRoot>,
      { wrapper: Wrapper }
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
