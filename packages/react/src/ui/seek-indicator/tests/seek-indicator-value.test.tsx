import { cleanup, render } from '@testing-library/react';
import type { SeekIndicatorCore } from '@videojs/core';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { SeekIndicator } from '..';
import { SeekIndicatorProvider } from '../context';

afterEach(cleanup);

describe('SeekIndicator.Value', () => {
  it('keeps its content populated while mounted', () => {
    const state: SeekIndicatorCore.State = {
      open: true,
      generation: 1,
      direction: 'forward',
      count: 1,
      seekTotal: 10,
      value: null,
      currentTime: '0:30',
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <SeekIndicatorProvider value={{ state }}>
        <SeekIndicator.Value data-testid="value" />
      </SeekIndicatorProvider>
    );

    expect(getByTestId('value').textContent).toBe('0:30');
  });
});
