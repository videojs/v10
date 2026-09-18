import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';

import InstallationMethodNavClient from './InstallationMethodNavClient';

describe('InstallationMethodNavClient', () => {
  it('shows the methods supported by React', () => {
    const markup = renderToString(<InstallationMethodNavClient currentFramework="react" route="react" />);

    expect(markup).toContain('data-installation-method="packaged"');
    expect(markup).toContain('data-installation-method="shadcn"');
    expect(markup).not.toContain('data-installation-method="cdn"');
  });

  it('shows every method supported by HTML', () => {
    const markup = renderToString(<InstallationMethodNavClient currentFramework="html" route="cdn" />);

    expect(markup).toContain('data-installation-method="packaged"');
    expect(markup).toContain('data-installation-method="shadcn"');
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
});
