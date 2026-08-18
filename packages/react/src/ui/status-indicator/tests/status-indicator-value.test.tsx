import { cleanup, render } from '@testing-library/react';
import type { StatusIndicatorCore } from '@videojs/core';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusIndicator } from '..';
import { StatusIndicatorProvider } from '../context';

afterEach(cleanup);

describe('StatusIndicator.Value', () => {
  it('renders the value from the nearest status indicator context', () => {
    const state: StatusIndicatorCore.State = {
      open: true,
      generation: 1,
      status: 'captions-on',
      label: 'Captions on',
      value: null,
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <StatusIndicatorProvider value={{ state }}>
        <StatusIndicator.Value data-testid="value" />
      </StatusIndicatorProvider>
    );

    expect(getByTestId('value').textContent).toBe('Captions on');
  });
});
