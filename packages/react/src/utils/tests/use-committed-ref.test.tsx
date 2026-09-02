import { cleanup, render } from '@testing-library/react';
import { type ReactNode, StrictMode, useLayoutEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MockErrorBoundary } from '../../testing/mocks';
import { useCommittedRef } from '../use-committed-ref';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useCommittedRef', () => {
  it('makes the initial value available to a lazy initializer', () => {
    const initialized: string[] = [];

    function Probe({ value }: { value: string }) {
      const committed = useCommittedRef(value);

      useState(() => initialized.push(committed.current));
      return null;
    }

    render(<Probe value="initial" />);

    expect(initialized).toEqual(['initial']);
  });

  it('publishes committed updates but not abandoned ones', () => {
    let read = () => 'unset';

    function Probe({ value, abandon = false }: { value: string; abandon?: boolean }): ReactNode {
      const committed = useCommittedRef(value);
      const [reader] = useState(() => () => committed.current);

      useLayoutEffect(() => {
        read = reader;
      }, [reader]);

      if (abandon) throw new Error('abandon render');

      return null;
    }

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <MockErrorBoundary>
        <Probe value="committed" />
      </MockErrorBoundary>
    );

    expect(read()).toBe('committed');

    rerender(
      <MockErrorBoundary>
        <Probe value="abandoned" abandon />
      </MockErrorBoundary>
    );

    expect(read()).toBe('committed');
  });

  it('publishes updates before descendant layout effects', () => {
    const observed: string[] = [];

    function Child({ read, commit }: { read: () => string; commit: string }) {
      useLayoutEffect(() => {
        if (commit) observed.push(read());
      }, [read, commit]);
      return null;
    }

    function Parent({ value }: { value: string }) {
      const committed = useCommittedRef(value);
      const [read] = useState(() => () => committed.current);

      return <Child read={read} commit={value} />;
    }

    const { rerender } = render(<Parent value="first" />);

    rerender(<Parent value="second" />);

    expect(observed).toEqual(['first', 'second']);
  });

  it('publishes the latest committed value under StrictMode', () => {
    let read = () => 'unset';

    function Probe({ value }: { value: string }) {
      const committed = useCommittedRef(value);

      useLayoutEffect(() => {
        read = () => committed.current;
      }, [committed]);

      return null;
    }

    const { rerender } = render(
      <StrictMode>
        <Probe value="first" />
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <Probe value="second" />
      </StrictMode>
    );

    expect(read()).toBe('second');
  });

  it('keeps the initial value available without effects during server rendering', () => {
    let observed = '';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Probe() {
      observed = useCommittedRef('server').current;
      return null;
    }

    renderToString(<Probe />);

    expect(observed).toBe('server');
    expect(consoleError).not.toHaveBeenCalled();
  });
});
