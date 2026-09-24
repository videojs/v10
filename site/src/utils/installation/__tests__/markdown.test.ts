import { describe, expect, it } from 'vite-plus/test';

import {
  renderInstallationMarkdownSelection,
  replaceInstallationMarkdownPlan,
  resolveInstallationMarkdownPlan,
  selectInstallationFramework,
} from '../markdown';

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

  it('treats an empty Shadcn framework query as the default', () => {
    const result = resolveInstallationMarkdownPlan(
      '/docs/guides/installation/shadcn.md',
      new URLSearchParams('framework='),
      '10.0.0-test'
    );

    expect(result?.ok).toBe(true);
    expect(result?.ok && result.plan.selection.framework).toBe('react');
  });

  it('applies every Shadcn query choice through the shared schema', () => {
    const params = new URLSearchParams({
      framework: 'svelte',
      preset: 'audio',
      skin: 'minimal',
      media: 'spotify',
      'source-url': 'https://open.spotify.com/episode/example',
      'package-manager': 'pnpm',
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

  it('rejects an unknown Shadcn framework', () => {
    const result = resolveInstallationMarkdownPlan(
      '/docs/guides/installation/shadcn.md',
      new URLSearchParams({ framework: 'angular' }),
      '10.0.0-test'
    );

    expect(result?.ok).toBe(false);
    expect(result && !result.ok && result.errors).toContainEqual(
      expect.objectContaining({ field: 'framework', value: 'angular' })
    );
  });

  it('rejects a framework query that conflicts with a canonical guide route', () => {
    const result = resolveInstallationMarkdownPlan(
      '/docs/guides/installation/cdn.md',
      new URLSearchParams({ framework: 'vue' }),
      '10.0.0-test'
    );

    expect(result?.ok).toBe(false);
    expect(result && !result.ok && result.errors).toContainEqual(
      expect.objectContaining({ field: 'framework', value: 'vue' })
    );
  });
});

describe('replaceInstallationMarkdownPlan', () => {
  it('replaces only the generated boundary', () => {
    const markdown = '# Guide\n\n<!-- installation-plan:start -->\nold\n<!-- installation-plan:end -->\n\nAfter';

    expect(replaceInstallationMarkdownPlan(markdown, 'new')).toBe(
      '# Guide\n\n<!-- installation-plan:start -->\n\nnew\n\n<!-- installation-plan:end -->\n\nAfter'
    );
  });

  it('preserves dollar replacement tokens verbatim', () => {
    const markdown = '# Guide\n\n<!-- installation-plan:start -->\nold\n<!-- installation-plan:end -->\n\nAfter';
    const replacement = "price $& $$ $' $` end";

    expect(replaceInstallationMarkdownPlan(markdown, replacement)).toBe(
      `# Guide\n\n<!-- installation-plan:start -->\n\n${replacement}\n\n<!-- installation-plan:end -->\n\nAfter`
    );
  });
});

describe('selectInstallationFramework', () => {
  const markdown = `Before

<!-- installation:framework react -->
React only
<!-- /installation:framework react -->

<!-- installation:framework html -->
HTML only
<!-- /installation:framework html -->

\`\`\`md
<!-- installation:framework react -->
Code example
<!-- /installation:framework react -->
\`\`\`

After`;

  it('keeps the selected source branch without changing fenced examples', () => {
    const selected = selectInstallationFramework(markdown, 'html');

    expect(selected).toContain('HTML only');
    expect(selected).not.toContain('\nReact only\n');
    expect(selected).toContain('<!-- installation:framework react -->\nCode example');
  });

  it('selects a branch that contains fenced code', () => {
    const withCode = `Before

<!-- installation:framework react -->
React only

\`\`\`tsx
<Video />
\`\`\`
<!-- /installation:framework react -->

<!-- installation:framework html -->
HTML only

\`\`\`html
<video-js></video-js>
\`\`\`
<!-- /installation:framework html -->

After`;
    const selected = selectInstallationFramework(withCode, 'html');

    expect(selected).toContain('<video-js></video-js>');
    expect(selected).not.toContain('<Video />');
    expect(selected).not.toContain('installation:framework');
  });

  it('fails when framework markers are unbalanced', () => {
    expect(() => selectInstallationFramework('<!-- installation:framework react -->\nReact only', 'react')).toThrow(
      'Unclosed installation framework branch: react'
    );
  });
});

describe('renderInstallationMarkdownSelection', () => {
  const markdown = `# Shadcn

<!-- installation-plan:start -->
Old plan
<!-- installation-plan:end -->

<!-- installation:framework react -->
React next step
<!-- /installation:framework react -->

<!-- installation:framework html -->
HTML next step
<!-- /installation:framework html -->`;

  it('renders the selected plan and matching source-framework content', () => {
    const rendered = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/shadcn',
      new URLSearchParams({ framework: 'vue' }),
      '10.0.0-test'
    );

    expect(rendered).toMatchObject({ status: 200, privateResponse: false });
    expect(rendered?.body).toContain('- `framework`: `vue`');
    expect(rendered?.body).toContain('HTML next step');
    expect(rendered?.body).not.toContain('React next step');
  });

  it('can preserve both source branches in the static edge template', () => {
    const rendered = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/shadcn',
      new URLSearchParams(),
      '10.0.0-test',
      { preserveFrameworkBranches: true }
    );

    expect(rendered?.body).toContain('- `framework`: `react`');
    expect(rendered?.body).toContain('React next step');
    expect(rendered?.body).toContain('HTML next step');
  });

  it('uses the shared error and missing-section responses', () => {
    const invalid = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/shadcn',
      new URLSearchParams({ media: '\n\n# Injected' }),
      '10.0.0-test'
    );
    const missing = renderInstallationMarkdownSelection(
      '# Shadcn',
      '/docs/guides/installation/shadcn',
      new URLSearchParams(),
      '10.0.0-test'
    );

    expect(invalid).toMatchObject({ status: 400, privateResponse: true });
    expect(invalid?.body).not.toContain('Injected');
    expect(missing).toEqual({
      body: 'The installation guide is missing its generated installation section.\n',
      privateResponse: true,
      status: 500,
    });
  });

  it('reports web query names in validation errors', () => {
    const packageManager = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/react',
      new URLSearchParams({ 'package-manager': 'deno' }),
      '10.0.0-test'
    );
    const sourceUrl = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/react',
      new URLSearchParams({ 'source-url': 'line one\nline two' }),
      '10.0.0-test'
    );
    const skin = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/shadcn',
      new URLSearchParams({ skin: 'none' }),
      '10.0.0-test'
    );
    const cdnPackageManager = renderInstallationMarkdownSelection(
      markdown,
      '/docs/guides/installation/cdn',
      new URLSearchParams({ 'package-manager': 'pnpm' }),
      '10.0.0-test'
    );

    expect(packageManager?.body).toContain('- package-manager: Expected one of: npm, pnpm, yarn, bun');
    expect(packageManager?.body).not.toContain('packageManager');
    expect(sourceUrl?.body).toContain('- source-url: Must not contain control characters or line breaks.');
    expect(sourceUrl?.body).not.toContain('sourceUrl');
    expect(skin?.body).toContain('the `none` skin is not available');
    expect(skin?.body).not.toContain('--skin');
    expect(cdnPackageManager).toMatchObject({ status: 200 });
    expect(cdnPackageManager?.body).toContain('- `package-manager`: `pnpm`');
    expect(cdnPackageManager?.body).toContain('pnpm create vite');
  });
});
