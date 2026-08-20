import { cleanup, render } from '@testing-library/react';
import type { VolumeIndicatorCore } from '@videojs/core';
import { afterEach, describe, expect, it } from 'vitest';
import { VolumeIndicator } from '..';
import { VolumeIndicatorProvider } from '../context';

afterEach(cleanup);

describe('VolumeIndicator.Fill', () => {
  it('owns the volume CSS variable', () => {
    const state: VolumeIndicatorCore.State = {
      open: true,
      generation: 1,
      level: 'high',
      value: '60%',
      fill: '60%',
      min: false,
      max: false,
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <VolumeIndicatorProvider value={{ state }}>
        <div data-testid="root">
          <VolumeIndicator.Fill data-testid="fill">
            <VolumeIndicator.Value data-testid="value" />
          </VolumeIndicator.Fill>
        </div>
      </VolumeIndicatorProvider>
    );

    expect(getByTestId('root').style.getPropertyValue('--media-volume-fill')).toBe('');
    expect(getByTestId('fill').style.getPropertyValue('--media-volume-fill')).toBe('60%');
    expect(getByTestId('value').textContent).toBe('60%');
  });
});
