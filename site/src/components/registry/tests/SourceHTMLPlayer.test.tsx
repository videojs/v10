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

  it('shows the setup for the selected Vue app', () => {
    registryProjectFramework.set('vue');
    template.set('vite');

    const { rerender } = render(<SourceHTMLPlayer part="imports" />);

    expect(screen.getByText(/Merge the matching/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'vite.config.ts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: 'nuxt.config.ts' })).not.toBeInTheDocument();

    act(() => template.set('nuxt'));
    rerender(<SourceHTMLPlayer part="imports" />);

    expect(screen.getByRole('tab', { name: 'nuxt.config.ts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/defineNuxtConfig/)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'vite.config.ts' })).not.toBeInTheDocument();

    act(() => template.set('astro'));
    rerender(<SourceHTMLPlayer part="imports" />);

    expect(screen.getByRole('tab', { name: 'astro.config.mjs' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/import vue from '@astrojs\/vue'/)).toBeInTheDocument();
  });

  it('switches framework output in place and imports framework skin components', () => {
    registryProjectFramework.set('vue');
    template.set('vite');
    render(<SourceHTMLPlayer part="player" />);

    expect(screen.getByRole('tab', { name: 'src/components/VideoPlayer.vue' })).toBeInTheDocument();
    expect(screen.getByText(/import VideoSkin from.*skin\.vue/)).toBeInTheDocument();
    expect(screen.getByText(/<VideoSkin>/)).toBeInTheDocument();
    expect(screen.getByText(/<slot \/>/)).toBeInTheDocument();
    expect(screen.getByText(/<video src=/)).toBeInTheDocument();

    act(() => registryProjectFramework.set('svelte'));

    expect(screen.getByRole('tab', { name: 'src/lib/VideoPlayer.svelte' })).toBeInTheDocument();
    expect(screen.getByText(/import VideoSkin from.*skin\.svelte/)).toBeInTheDocument();
    expect(screen.getByText(/<VideoSkin>/)).toBeInTheDocument();
    expect(screen.getByText(/<slot \/>/)).toBeInTheDocument();
    expect(screen.getByText(/<video src=/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'src/App.svelte' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'src/routes/+page.svelte' })).not.toBeInTheDocument();

    act(() => template.set('astro'));

    expect(screen.getByRole('tab', { name: 'src/components/VideoPlayer.svelte' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'src/pages/index.astro' })).toBeInTheDocument();
    expect(screen.getByText(/<VideoPlayer client:load>/)).toBeInTheDocument();

    act(() => template.set('sveltekit'));

    expect(screen.getByRole('tab', { name: 'src/routes/+page.svelte' })).toBeInTheDocument();
    expect(screen.getByText(/\$lib\/components\/videojs\/video\/skin/)).toBeInTheDocument();
    expect(screen.queryByText(/#lib\/components\/videojs\/video\/skin/)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'src/App.svelte' })).not.toBeInTheDocument();
  });

  it('renders the plain HTML route shape during SSR', () => {
    registryProjectFramework.set('vue');

    const markup = renderToString(<SourceHTMLPlayer part="player" />);

    expect(markup).toContain('index.html');
    expect(markup).toContain('/src/player.ts');
    expect(markup).not.toContain('VideoPlayer.vue');
  });
});
