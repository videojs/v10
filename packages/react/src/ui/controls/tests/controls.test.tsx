import { render } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';

import { createPlayerWrapper } from '../../../testing/mocks';
import { ControlsContent } from '../controls-content';
import { ControlsRoot } from '../controls-root';

describe('ControlsRoot', () => {
  it('renders no wrapper element', () => {
    const { Wrapper } = createPlayerWrapper({
      controlsVisible: true,
      userActive: true,
    });
    const { container } = render(
      <ControlsRoot>
        <span data-testid="child" />
      </ControlsRoot>,
      { wrapper: Wrapper }
    );

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.localName).toBe('span');
  });
});

describe('ControlsContent', () => {
  it('marks the controls surface as interactive and receives controls state', () => {
    const { Wrapper } = createPlayerWrapper({
      controlsVisible: true,
      userActive: true,
    });
    const { getByTestId } = render(
      <ControlsRoot>
        <ControlsContent data-testid="controls" />
      </ControlsRoot>,
      { wrapper: Wrapper }
    );

    const content = getByTestId('controls');

    expect(content.hasAttribute('data-interactive')).toBe(true);
    expect(content.hasAttribute('data-visible')).toBe(true);
    expect(content.hasAttribute('data-user-active')).toBe(true);
  });
});
