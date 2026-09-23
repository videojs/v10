import { describe, expect, it } from 'vite-plus/test';

import { replaceInstallationMarkdownPlan, resolveInstallationMarkdownPlan } from '../markdown';

describe('resolveInstallationMarkdownPlan', () => {
  it.each([
    ['react', 'react', 'packaged'],
    ['html', 'html', 'packaged'],
    ['vue', 'vue', 'packaged'],
    ['svelte', 'svelte', 'packaged'],
    ['cdn', 'html', 'cdn'],
    ['shadcn', 'react', 'shadcn'],
  ])('renders defaults for the %s guide', (route, framework, method) => {
    const result = resolveInstallationMarkdownPlan(
      `/docs/guides/installation/${route}`,
      new URLSearchParams(),
      '10.0.0-test'
    );

    expect(result?.ok && result.plan.selection.framework).toBe(framework);
    expect(result?.ok && result.plan.selection.method).toBe(method);
    expect(result?.ok && result.plan.steps.length).toBeGreaterThan(0);
  });

  it('applies every Shadcn query choice through the shared schema', () => {
    const params = new URLSearchParams({
      framework: 'svelte',
      preset: 'audio',
      skin: 'minimal',
      media: 'spotify',
      'source-url': 'https://open.spotify.com/episode/example',
      'install-method': 'pnpm',
      template: 'vite',
      styling: 'css',
    });
    const result = resolveInstallationMarkdownPlan('/docs/guides/installation/shadcn.md', params, '10.0.0-test');

    expect(result?.ok && result.plan.selection).toMatchObject({
      framework: 'svelte',
      sourceFramework: 'html',
      preset: 'audio',
      skinFlag: 'minimal',
      media: 'spotify',
      packageManager: 'pnpm',
      template: 'vite',
      styling: 'css',
    });
  });
});

describe('replaceInstallationMarkdownPlan', () => {
  it('replaces only the generated boundary', () => {
    const markdown = '# Guide\n\n<!-- installation-plan:start -->\nold\n<!-- installation-plan:end -->\n\nAfter';

    expect(replaceInstallationMarkdownPlan(markdown, 'new')).toBe(
      '# Guide\n\n<!-- installation-plan:start -->\n\nnew\n\n<!-- installation-plan:end -->\n\nAfter'
    );
  });
});
