// @vitest-environment node

import { useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { useIsomorphicLayoutEffect } from '../use-isomorphic-layout-effect';

describe('useIsomorphicLayoutEffect', () => {
  it('uses a passive effect without warnings during server rendering', () => {
    const effect = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Probe() {
      useIsomorphicLayoutEffect(effect);
      return null;
    }

    expect(useIsomorphicLayoutEffect).toBe(useEffect);
    renderToString(<Probe />);

    expect(effect).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
