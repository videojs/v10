import { cleanup, render } from '@testing-library/react';
import type { TooltipGroupCore } from '@videojs/core';
import { type ReactNode, StrictMode, useLayoutEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MockErrorBoundary } from '../../../testing/mocks';
import { useTooltipGroup } from '../group-context';
import { TooltipProvider } from '../tooltip-provider';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function LayoutGroupDelay({ commit, observed }: { commit: string; observed: number[] }) {
  const group = useTooltipGroup();

  useLayoutEffect(() => {
    if (commit && group) observed.push(group.delay);
  }, [commit, group, observed]);

  return null;
}

function CaptureGroup({ onGroup }: { onGroup: (group: TooltipGroupCore | undefined) => void }) {
  onGroup(useTooltipGroup());
  return null;
}

function Thrower({ abandon }: { abandon: boolean }): ReactNode {
  if (abandon) throw new Error('abandon render');

  return null;
}

describe('TooltipProvider', () => {
  it('publishes props before descendant layout effects', () => {
    const observed: number[] = [];
    const { rerender } = render(
      <TooltipProvider delay={100}>
        <LayoutGroupDelay commit="first" observed={observed} />
      </TooltipProvider>
    );

    rerender(
      <TooltipProvider delay={200}>
        <LayoutGroupDelay commit="second" observed={observed} />
      </TooltipProvider>
    );

    expect(observed).toEqual([100, 200]);
  });

  it('does not publish props from an abandoned render', () => {
    let group: TooltipGroupCore | undefined;
    const capture = (value: TooltipGroupCore | undefined) => {
      group = value;
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <MockErrorBoundary>
        <TooltipProvider delay={100}>
          <CaptureGroup onGroup={capture} />
          <Thrower abandon={false} />
        </TooltipProvider>
      </MockErrorBoundary>
    );

    expect(group?.delay).toBe(100);

    rerender(
      <MockErrorBoundary>
        <TooltipProvider delay={200}>
          <CaptureGroup onGroup={capture} />
          <Thrower abandon />
        </TooltipProvider>
      </MockErrorBoundary>
    );

    expect(group?.delay).toBe(100);
  });

  it('publishes the latest props under StrictMode', () => {
    let group: TooltipGroupCore | undefined;
    const capture = (value: TooltipGroupCore | undefined) => {
      group = value;
    };

    const { rerender } = render(
      <StrictMode>
        <TooltipProvider delay={100}>
          <CaptureGroup onGroup={capture} />
        </TooltipProvider>
      </StrictMode>
    );

    expect(group?.delay).toBe(100);

    rerender(
      <StrictMode>
        <TooltipProvider delay={200}>
          <CaptureGroup onGroup={capture} />
        </TooltipProvider>
      </StrictMode>
    );

    expect(group?.delay).toBe(200);
  });
});
