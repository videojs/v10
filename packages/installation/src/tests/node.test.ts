import { describe, expect, it } from 'vitest';

import { runAgentsInit } from '../node';
import { installationCommand } from '../plan';

describe('runAgentsInit', () => {
  it('can target the locally installed package without forcing an npm tag', () => {
    expect(installationCommand('react', undefined, null)).toBe('npx @videojs/react agents init');
  });

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
    expect(value.options.find(({ flag }: { flag: string }) => flag === '--method').values).toEqual([
      'packaged',
      'shadcn',
      'cdn',
    ]);
    expect(value.compatibility.mediaByPreset.audio).toEqual(['html5-audio', 'mux-audio', 'spotify']);
  });

  it('escapes a custom source URL in generated markup and Markdown fences', () => {
    const source = 'https://example.com/video.mp4?label="four````ticks"&autoplay=1';
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--source-url', source]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'src="https://example.com/video.mp4?label=&quot;four````ticks&quot;&amp;autoplay=1"'
    );
    expect(result.stdout).toContain('`````html');
    expect(result.stdout).toContain(`- \`source-url\`: \`\`\`\`\`${source}\`\`\`\`\``);
    expect(result.stdout).not.toContain(`src="${source}"`);
  });

  it('returns valid framework-specific next links in JSON without duplicating them in Markdown', () => {
    const json = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'vue', '--json']);
    const markdown = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'vue']);
    const value = JSON.parse(json.stdout);

    expect(value.next).toEqual([
      { label: 'Customize skins', url: 'https://videojs.org/docs/framework/html/guides/customize-skins' },
      { label: 'Browser support', url: 'https://videojs.org/docs/framework/html/guides/browser-support' },
    ]);
    expect(markdown.stdout).not.toContain('## What to do next');
  });

  it('returns usage errors with exit code 2', () => {
    const result = runAgentsInit('react', '10.0.0', ['agents', 'init', '--method', 'cdn', '--json']);
    const value = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(2);
    expect(value.kind).toBe('error');
  });

  it('attributes CLI syntax errors to arguments rather than an installation option', () => {
    const command = JSON.parse(runAgentsInit('react', '10.0.0', ['install', '--json']).stdout);
    const flag = JSON.parse(runAgentsInit('react', '10.0.0', ['agents', 'init', '--wat', '--json']).stdout);

    expect(command.errors[0].field).toBe('arguments');
    expect(flag.errors[0].field).toBe('arguments');
  });
});
