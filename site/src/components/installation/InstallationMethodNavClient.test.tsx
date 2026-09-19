import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { renderer, skin, useCase } from '@/stores/installation';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  savePageScrollForNavigation: vi.fn(),
}));

vi.mock('astro:transitions/client', () => ({ navigate: mocks.navigate }));
vi.mock('@/utils/docs/navigation', () => ({
  DOCS_FRAMEWORK_NAVIGATION_INFO: { docsNavigation: 'framework' },
  savePageScrollForNavigation: mocks.savePageScrollForNavigation,
}));

import InstallationMethodNavClient from './InstallationMethodNavClient';

describe('InstallationMethodNavClient', () => {
  afterEach(() => {
    cleanup();
    useCase.set('default-video');
    skin.set('video');
    renderer.set('html5-video');
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
  });

  it('shows the methods supported by React', () => {
    const markup = renderToString(<InstallationMethodNavClient currentFramework="react" route="react" />);

    expect(markup).toContain('data-installation-method="packaged"');
    expect(markup).toContain('data-installation-method="shadcn"');
    expect(markup).toContain('href="/docs/guides/installation/shadcn?framework=react"');
    expect(markup).not.toContain('data-installation-method="cdn"');
  });

  it('shows every method supported by HTML', () => {
    const markup = renderToString(<InstallationMethodNavClient currentFramework="html" route="cdn" />);

    expect(markup).toContain('data-installation-method="packaged"');
    expect(markup).toContain('data-installation-method="shadcn"');
    expect(markup).toContain('href="/docs/guides/installation/shadcn?framework=html"');
    expect(markup).toContain('data-installation-method="cdn"');
  });

  it('shows only Packaged for Vue and Svelte', () => {
    const vue = renderToString(<InstallationMethodNavClient currentFramework="vue" route="vue" />);
    const svelte = renderToString(<InstallationMethodNavClient currentFramework="svelte" route="svelte" />);

    expect(vue).toContain('data-installation-method="packaged"');
    expect(vue).not.toContain('data-installation-method="shadcn"');
    expect(vue).toContain('max-w-3xl');
    expect(vue).toContain('sm:grid-cols-3');
    expect(vue).toContain('mx-auto');
    expect(svelte).toContain('data-installation-method="packaged"');
    expect(svelte).not.toContain('data-installation-method="cdn"');
  });

  it('prerenders a stable Shadcn card set and lets CSS reveal the HTML-only method', () => {
    const markup = renderToString(<InstallationMethodNavClient currentFramework="react" route="shadcn" />);

    expect(markup).toContain('data-installation-method="packaged"');
    expect(markup).toContain('data-installation-method="shadcn"');
    expect(markup).toContain('data-installation-method="cdn"');
    expect(markup).toContain('data-shadcn-html-method=""');
  });

  it('hands method navigation to Astro with the existing scroll restoration metadata', async () => {
    window.history.replaceState(null, '', '/docs/guides/installation/react?preset=audio');
    useCase.set('default-audio');
    skin.set('minimal-audio');
    renderer.set('html5-audio');
    const { getByRole } = render(<InstallationMethodNavClient currentFramework="react" route="react" />);
    const link = getByRole('link', { name: /Shadcn/ });

    await waitFor(() => expect(link.getAttribute('href')).toContain('preset=audio'));
    fireEvent.click(link);
    await Promise.resolve();

    const target = '/docs/guides/installation/shadcn?preset=audio&skin=minimal&framework=react';

    expect(mocks.savePageScrollForNavigation).toHaveBeenCalledWith(target);
    expect(mocks.navigate).toHaveBeenCalledWith(target, {
      history: 'push',
      info: { docsNavigation: 'framework' },
    });
  });

  it('leaves modified clicks to the native link behavior', () => {
    window.history.replaceState(null, '', '/docs/guides/installation/react');
    const { getByRole } = render(<InstallationMethodNavClient currentFramework="react" route="react" />);
    const link = getByRole('link', { name: /Shadcn/ });

    link.setAttribute('target', '_blank');
    fireEvent.click(link, { metaKey: true });

    expect(mocks.savePageScrollForNavigation).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
