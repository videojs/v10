import { describe, expect, it } from 'vitest';

import { INSTALLATION_DEMO_SOURCES } from '../defaults';
import { runAgentsInit } from '../node';
import { installationCommand } from '../plan';

describe('runAgentsInit', () => {
  it('can target the locally installed package without forcing an npm tag', () => {
    expect(installationCommand('react', undefined, null)).toBe('npx @videojs/react agents init');
    expect(installationCommand('react')).toBe('npx @videojs/react agents init');
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
    expect(result.stdout).toContain('npm install @videojs/hlsjs-video@10.0.0');
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

  it('uses the demo source when source-url is explicitly empty', () => {
    const separate = runAgentsInit('html', '10.0.0', ['agents', 'init', '--source-url', '']);
    const equals = runAgentsInit('html', '10.0.0', ['agents', 'init', '--source-url=']);
    const missingMethod = runAgentsInit('html', '10.0.0', ['agents', 'init', '--method', '']);

    expect(separate.exitCode).toBe(0);
    expect(separate.stdout).toContain(INSTALLATION_DEMO_SOURCES.videoMp4);
    expect(equals.exitCode).toBe(0);
    expect(equals.stdout).toContain(INSTALLATION_DEMO_SOURCES.videoMp4);
    expect(missingMethod.exitCode).toBe(2);
  });

  it('returns valid framework-specific next links in JSON and Markdown', () => {
    const json = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'vue', '--json']);
    const markdown = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'vue']);
    const value = JSON.parse(json.stdout);

    expect(value.next).toEqual([
      { label: 'Customize skins', url: 'https://videojs.org/docs/framework/html/guides/customize-skins' },
      { label: 'Browser support', url: 'https://videojs.org/docs/framework/html/guides/browser-support' },
    ]);
    expect(markdown.stdout).toContain('## Next steps');
    expect(markdown.stdout).toContain(
      '[Customize skins](https://videojs.org/docs/framework/html/guides/customize-skins)'
    );
  });

  it('pins every generated package install to the package version', () => {
    const packaged = runAgentsInit('react', '10.0.0-rc.2', ['agents', 'init', '--media', 'mux-video']);
    const shadcn = runAgentsInit('react', '10.0.0-rc.2', ['agents', 'init', '--method', 'shadcn', '--media', 'hls']);

    expect(packaged.stdout).toContain(
      'npm install @videojs/react@10.0.0-rc.2 @videojs/mux-video@10.0.0-rc.2 @videojs/mux-data@10.0.0-rc.2'
    );
    expect(shadcn.stdout).toContain('npm install @videojs/hlsjs-video@10.0.0-rc.2');
  });

  it('omits skin from background-video instructions and reproduction commands', () => {
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--preset', 'background-video']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('- `skin`:');
    expect(result.stdout).not.toContain('--skin');
  });

  it('scopes discovery choices to the package that owns the command', () => {
    const markdown = runAgentsInit('react', '10.0.0', ['agents', 'init']);
    const json = JSON.parse(runAgentsInit('react', '10.0.0', ['agents', 'init', '--json']).stdout);
    const method = json.options.find(({ flag }: { flag: string }) => flag === '--method');

    expect(method.description).not.toContain('CDN');
    expect(json.compatibility.methodsByFramework).toEqual({ react: ['packaged', 'shadcn'] });
    expect(json.compatibility.shadcn.templatesByFramework).toEqual({
      react: ['next', 'vite', 'start', 'laravel', 'react-router', 'astro'],
    });
    expect(markdown.stdout).not.toContain('- `html`: templates');
    expect(markdown.stdout).not.toContain('CDN is plain HTML only');
  });

  it('returns usage errors with exit code 2', () => {
    const result = runAgentsInit('react', '10.0.0', ['agents', 'init', '--method', 'cdn', '--json']);
    const value = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(2);
    expect(value.kind).toBe('error');
  });

  it('uses public flags in text validation errors', () => {
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--method', 'cdn', '--package-manager', 'pnpm']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('- --package-manager: does not apply to CDN installation.');
    expect(result.stderr).not.toContain('packageManager');
  });

  it('attributes CLI syntax errors to arguments rather than an installation option', () => {
    const command = JSON.parse(runAgentsInit('react', '10.0.0', ['install', '--json']).stdout);
    const flag = JSON.parse(runAgentsInit('react', '10.0.0', ['agents', 'init', '--wat', '--json']).stdout);

    expect(command.errors[0].field).toBe('arguments');
    expect(flag.errors[0].field).toBe('arguments');
  });
});
