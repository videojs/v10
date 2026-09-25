import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { template } from '@/stores/installation';
import { registryProjectFramework } from '@/stores/registry';

vi.mock('@/components/Code/ClientCode', () => ({
  default: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

import SourceHTMLPlayer from '../SourceHTMLPlayer';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('SourceHTMLPlayer', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    registryProjectFramework.set('react');
    template.set('next');
    vi.unstubAllGlobals();
  });

  it('shows the entry setup for the selected HTML app', () => {
    registryProjectFramework.set('html');
    template.set('vite');

    const { rerender } = render(<SourceHTMLPlayer part="imports" />);

    expect(screen.getByRole('tab', { name: 'src/player.ts' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'vite.config.js' })).not.toBeInTheDocument();

    act(() => template.set('laravel'));
    rerender(<SourceHTMLPlayer part="imports" />);

    expect(screen.getByRole('tab', { name: 'vite.config.js' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'resources/js/player.ts' })).toBeInTheDocument();
  });

  it('switches the player file in place when the app setup changes', () => {
    registryProjectFramework.set('html');
    template.set('vite');
    render(<SourceHTMLPlayer part="player" />);

    expect(screen.getByRole('tab', { name: 'index.html' })).toBeInTheDocument();
    expect(screen.getByText(/<script type="module" src="\/src\/player\.ts"><\/script>/)).toBeInTheDocument();

    act(() => template.set('astro'));

    expect(screen.getByRole('tab', { name: 'src/pages/index.astro' })).toBeInTheDocument();
    expect(screen.getByText(/<script src="\.\.\/scripts\/player\.ts"><\/script>/)).toBeInTheDocument();
  });

  it('renders the plain HTML route shape during SSR', () => {
    registryProjectFramework.set('react');

    const markup = renderToString(<SourceHTMLPlayer part="player" />);

    expect(markup).toContain('index.html');
    expect(markup).toContain('/src/player.ts');
    expect(markup).not.toContain('app/page.tsx');
  });
});
