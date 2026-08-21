import { cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { useLatestRef } from '../use-latest-ref';

afterEach(cleanup);

describe('useLatestRef', () => {
  it('makes the initial value available to a lazy initializer', () => {
    const initialized: string[] = [];

    function Probe({ value }: { value: string }) {
      const latest = useLatestRef(value);
      useState(() => initialized.push(latest.current));
      return null;
    }

    render(<Probe value="initial" />);

    expect(initialized).toEqual(['initial']);
  });

  it('updates the same ref during render', () => {
    const observed: string[] = [];
    const refs: Array<useLatestRef.Result<string>> = [];

    function Probe({ value }: { value: string }) {
      const latest = useLatestRef(value);
      observed.push(latest.current);
      refs.push(latest);
      return null;
    }

    const { rerender } = render(<Probe value="first" />);
    rerender(<Probe value="second" />);

    expect(observed).toEqual(['first', 'second']);
    expect(refs[1]).toBe(refs[0]);
  });

  it('keeps the initial value available during server rendering', () => {
    let observed = '';

    function Probe() {
      observed = useLatestRef('server').current;
      return null;
    }

    renderToString(<Probe />);

    expect(observed).toBe('server');
  });
});
