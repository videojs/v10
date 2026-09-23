import { describe, expect, it } from 'vitest';

import { runAgentsInit } from '../node';

describe('runAgentsInit', () => {
  it('returns discovery without modifying a project', () => {
    const result = runAgentsInit('react', '10.0.0', ['agents', 'init']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('never installs packages');
    expect(result.stdout).toContain('--method');
  });

  it('returns complete selected instructions', () => {
    const result = runAgentsInit('html', '10.0.0', [
      'agents',
      'init',
      '--framework',
      'vue',
      '--method',
      'shadcn',
      '--media',
      'hls',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('## Initialize Shadcn');
    expect(result.stdout).toContain('## Install the media adapter');
    expect(result.stdout).toContain('vite.config.ts');
    expect(result.stdout).toContain("tag.startsWith('media-')");
    expect(result.stdout).toContain('components/VideoPlayer.vue');
    expect(result.stdout).not.toContain('### `index.html`');
  });

  it('uses Svelte component files for Shadcn HTML source', () => {
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'svelte', '--method', 'shadcn']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('src/lib/VideoPlayer.svelte');
    expect(result.stdout).toContain('src/routes/+page.svelte');
    expect(result.stdout).not.toContain('### `index.html`');
  });

  it('returns one JSON document', () => {
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--json']);
    const value = JSON.parse(result.stdout);

    expect(result.stderr).toBe('');
    expect(value.kind).toBe('discovery');
  });

  it('returns usage errors with exit code 2', () => {
    const result = runAgentsInit('react', '10.0.0', ['agents', 'init', '--method', 'cdn', '--json']);
    const value = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(2);
    expect(value.kind).toBe('error');
  });
});
