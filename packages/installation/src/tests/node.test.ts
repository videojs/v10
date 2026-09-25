import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { INSTALLATION_DEMO_SOURCES } from '../defaults';
import {
  detectFramework,
  detectInstalledPlayerVersions,
  detectPackageManager,
  runAgentsInit,
  type AgentsInitDefaults,
} from '../node';
import { installationCompatibility } from '../options';
import { installationCommand } from '../plan';
import { INSTALLATION_FRAMEWORKS } from '../projects';
import { installationMethodsForFramework, installationTemplatesForMethod, sourceFrameworkFor } from '../selection';
import { defaultRegistryStyling } from '../shadcn';

const reactProject = {
  framework: { value: 'react', source: 'package.json dependencies' },
} as const satisfies AgentsInitDefaults;

/** Split a printed command whose quoted values never contain an escaped quote. */
function commandArguments(command: string): string[] {
  const words = command.match(/'[^']*'|\S+/g) ?? [];

  return words.slice(2).map((word) => (word.startsWith("'") ? word.slice(1, -1) : word));
}

function withTemporaryDirectory(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'videojs-installation-'));

  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('installationCommand', () => {
  it('runs the CLI package without forcing an npm tag', () => {
    expect(installationCommand(undefined, null)).toBe('npx @videojs/cli agents init');
    expect(installationCommand()).toBe('npx @videojs/cli agents init');
    expect(installationCommand({ framework: 'react', media: 'hls' }, '10.0.0')).toBe(
      'npx @videojs/cli@10.0.0 agents init --framework react --media hls'
    );
  });
});

describe('runAgentsInit', () => {
  it('returns discovery without modifying a project', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init'], reactProject);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('never installs packages');
    expect(result.stdout).toContain('--method');
  });

  it('uses the detected package manager and gives fully explicit examples', () => {
    const discovery = JSON.parse(
      runAgentsInit('10.0.0', ['agents', 'init', '--json'], { packageManager: 'yarn' }).stdout
    );
    const packageManager = discovery.options.find(({ flag }: { flag: string }) => flag === '--package-manager');

    expect(packageManager.default).toBe('yarn');

    // SAFETY: discovery JSON is produced by createInstallationDiscovery, whose examples field is a string array.
    for (const example of discovery.examples as string[]) {
      const args = example.split(' ').slice(2);
      const result = runAgentsInit('10.0.0', args);

      expect(result.exitCode, example).toBe(0);
      expect(result.stdout, example).toContain('Defaulted options: none.');
    }
  });

  it('returns complete selected instructions', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--method', 'shadcn', '--media', 'hls']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('## Configure Shadcn');
    expect(result.stdout).toContain(
      'pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
    expect(result.stdout).toContain('Shadcn skips configured namespaces');
    expect(result.stdout).toContain('## Install the media adapter');
    expect(result.stdout).toContain('pnpm add @videojs/hlsjs-video@10.0.0');
    expect(result.stdout).toContain('vite.config.ts');
    expect(result.stdout).toContain("import '@/components/videojs/video/skin';");
  });

  it('adds selected extensions to packages and player code', () => {
    const result = runAgentsInit(
      '10.0.0',
      ['agents', 'init', '--media', 'hls', '--extensions', 'google-cast'],
      reactProject
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('@videojs/google-cast@10.0.0');
    expect(result.stdout).toContain("import { GoogleCast } from '@videojs/react/extensions/google-cast'");
    expect(result.stdout).toContain('<GoogleCast />');
  });

  it('omits the unused package manager for an existing CDN page', () => {
    const result = runAgentsInit('10.0.0', [
      'agents',
      'init',
      '--method',
      'cdn',
      '--project',
      'existing',
      '--template',
      'none',
      '--json',
    ]);
    const value = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(value.selectedOptions['package-manager']).toBeUndefined();
    expect(value.defaultedOptions).not.toContain('package-manager');
    expect(
      value.steps
        .flatMap(({ blocks }: { blocks: Array<{ code: string }> }) => blocks.map(({ code }) => code))
        .join('\n')
    ).not.toContain('pnpm');
  });

  it('uses an existing HTML setup without inventing scaffold or run commands', () => {
    const result = runAgentsInit('10.0.0', [
      'agents',
      'init',
      '--method',
      'packaged',
      '--framework',
      'html',
      '--template',
      'none',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('## Prepare');
    expect(result.stdout).not.toContain('## Run your app');
    expect(result.stdout).not.toContain('create vite');
    expect(result.stdout).not.toContain('pnpm dev');
  });

  it('shows the likely development command for an existing named app setup', () => {
    const result = runAgentsInit(
      '10.0.0',
      [
        'agents',
        'init',
        '--method',
        'packaged',
        '--framework',
        'react',
        '--project',
        'existing',
        '--template',
        'start',
      ],
      reactProject
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('## Prepare');
    expect(result.stdout).toContain('## Run your app');
    expect(result.stdout).toContain('pnpm dev');
    expect(result.stdout).not.toContain('Continue in the existing');
  });

  it('rejects Shadcn for Vue and Svelte projects', () => {
    for (const framework of ['vue', 'svelte']) {
      const result = runAgentsInit('10.0.0', ['agents', 'init', '--framework', framework, '--method', 'shadcn']);

      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(
        '- --method: Shadcn installation is available for React and plain HTML. Use packaged installation for Vue or Svelte.'
      );
    }
  });

  it('lets Shadcn scaffold a new React Tailwind app without double scaffolding', () => {
    const result = runAgentsInit(
      '10.0.0',
      ['agents', 'init', '--method', 'shadcn', '--project', 'new', '--template', 'vite', '--styling', 'tailwind'],
      reactProject
    );

    expect(result.stdout).toContain('pnpm dlx shadcn@latest init --template vite');
    expect(result.stdout).not.toContain('pnpm dlx shadcn@latest init --base base --preset nova --yes');
    expect(result.stdout).not.toContain('# Optional: run if components.json does not exist.');
    expect(result.stdout).not.toContain('pnpm create vite');
  });

  it('keeps alias-free Shadcn initialization with the registry commands', () => {
    const result = runAgentsInit(
      '10.0.0',
      ['agents', 'init', '--method', 'shadcn', '--project', 'existing', '--template', 'next', '--styling', 'tailwind'],
      reactProject
    );

    expect(result.stdout).not.toContain('## Configure Shadcn');
    expect(result.stdout).toContain('## Create components.json (optional)');
    expect(result.stdout).toContain('## Add the Video.js Registry');
    expect(result.stdout).toContain('## Add the skin source');
    expect(result.stdout).toContain('# Optional: run if components.json does not exist.');
    expect(result.stdout).toContain('pnpm dlx shadcn@latest init --base base --preset nova --yes');
  });

  it('writes Shadcn aliases where Vite and Shadcn both resolve them', () => {
    const result = runAgentsInit(
      '10.0.0',
      ['agents', 'init', '--method', 'shadcn', '--template', 'vite', '--styling', 'css'],
      reactProject
    );

    expect(result.stdout).toContain('### `tsconfig.json`');
    expect(result.stdout).toContain('### `tsconfig.app.json`');
    expect(result.stdout).toContain('"tsx": true');
    expect(result.stdout).not.toContain('"baseUrl"');
  });

  it('uses Astro and Laravel entry conventions for HTML apps', () => {
    const astro = runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'html', '--template', 'astro']);
    const laravel = runAgentsInit('10.0.0', [
      'agents',
      'init',
      '--framework',
      'html',
      '--project',
      'new',
      '--template',
      'laravel',
    ]);

    expect(astro.stdout).toContain('<script src="../scripts/player.ts"></script>');
    expect(astro.stdout).not.toContain('<script type="module" src="../scripts/player.ts"></script>');
    expect(laravel.stdout).toContain('laravel new videojs-app --pnpm --no-interaction');
    expect(laravel.stdout).toContain('## Configure your app entry');
    expect(laravel.stdout).toContain("'resources/js/player.ts'");
  });

  it('keeps the optional Vite scaffold in CDN agent instructions', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--method', 'cdn', '--project', 'new']);

    expect(result.stdout).toContain('## Create the app');
    expect(result.stdout).toContain('pnpm create vite');
    expect(result.stdout).toContain('## Run your app');
    expect(result.stdout).toContain('Scaffold a minimal Vite site');
    expect(result.stdout).toContain('page head or before the closing body tag');
    expect(result.stdout).toContain('inside the page body');
  });

  it('keeps packaged Nuxt player markup on the client', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'vue', '--template', 'nuxt']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('app/components/VideoPlayer.client.vue');
    expect(result.stdout).toContain("import { VideoPlayer } from '#components'");
    expect(result.stdout).not.toContain("from './components/VideoPlayer.client.vue'");
  });

  it('does not add framework setup instructions to an existing Astro app', () => {
    const result = runAgentsInit(
      '10.0.0',
      ['agents', 'init', '--method', 'shadcn', '--template', 'astro', '--json'],
      reactProject
    );
    // SAFETY: runAgentsInit produced instruction JSON above, whose steps expose stable string IDs.
    const steps = JSON.parse(result.stdout).steps as Array<{ id: string }>;

    expect(result.exitCode).toBe(0);
    expect(steps.some(({ id }) => id === 'configure-framework')).toBe(false);
  });

  it('re-runs the generated native-audio command without changing its selection', () => {
    const first = JSON.parse(
      runAgentsInit('10.0.0', ['agents', 'init', '--preset', 'audio', '--media', 'html5-audio', '--json']).stdout
    );
    const args = first.reproduceCommand.split(' ').slice(2);

    expect(first.reproduceCommand).toMatch(
      /^npx @videojs\/cli@10\.0\.0 agents init --method packaged --framework html /
    );

    const reproduced = runAgentsInit('10.0.0', [...args, '--json']);

    expect(reproduced.exitCode).toBe(0);
    expect(JSON.parse(reproduced.stdout).selectedOptions).toEqual(first.selectedOptions);
  });

  it('returns one JSON document', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--json']);
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

  it('exposes public option names without internal selection fields in instruction JSON', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--preset', 'background-video', '--json']);
    const value = JSON.parse(result.stdout);

    expect(value.kind).toBe('instructions');
    expect(value.selection).toBeUndefined();
    expect(value.selectedOptions).toMatchObject({
      method: 'packaged',
      framework: 'html',
      preset: 'background-video',
      'package-manager': 'pnpm',
    });
    expect(value.selectedOptions.skin).toBeUndefined();
    expect(value.selectedOptions.cdnBase).toBeUndefined();
    expect(value.defaultedOptions).not.toContain('skin');
  });

  it('supports top-level discovery and version JSON forms', () => {
    const discovery = JSON.parse(runAgentsInit('10.0.0', ['--help', '--json'], reactProject).stdout);
    const bareJson = JSON.parse(runAgentsInit('10.0.0', ['--json'], reactProject).stdout);
    const version = JSON.parse(runAgentsInit('10.0.0', ['agents', 'init', '--version', '--json'], reactProject).stdout);
    const topLevelVersion = JSON.parse(runAgentsInit('10.0.0', ['--version', '--json'], reactProject).stdout);

    expect(discovery.kind).toBe('discovery');
    expect(bareJson.kind).toBe('discovery');
    expect(version).toMatchObject({ kind: 'version', package: '@videojs/cli', packageVersion: '10.0.0' });
    expect(topLevelVersion).toEqual(version);
  });

  it('escapes a custom source URL in generated markup and Markdown fences', () => {
    const source = 'https://example.com/video.mp4?label="four````ticks"&autoplay=1';
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--source-url', source]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'src="https://example.com/video.mp4?label=&quot;four````ticks&quot;&amp;autoplay=1"'
    );
    expect(result.stdout).toContain('`````html');
    expect(result.stdout).toContain(`- \`source-url\`: \`\`\`\`\`${source}\`\`\`\`\``);
    expect(result.stdout).not.toContain(`src="${source}"`);
  });

  it('uses the demo source when source-url is explicitly empty', () => {
    const separate = runAgentsInit('10.0.0', ['agents', 'init', '--source-url', '']);
    const equals = runAgentsInit('10.0.0', ['agents', 'init', '--source-url=']);
    const missingMethod = runAgentsInit('10.0.0', ['agents', 'init', '--method', '']);

    expect(separate.exitCode).toBe(0);
    expect(separate.stdout).toContain(INSTALLATION_DEMO_SOURCES.videoMp4);
    expect(equals.exitCode).toBe(0);
    expect(equals.stdout).toContain(INSTALLATION_DEMO_SOURCES.videoMp4);
    expect(missingMethod.exitCode).toBe(2);
  });

  it('treats an explicit demo source as a choice that reruns to the same plan', () => {
    const failures: string[] = [];

    for (const [preset, media] of Object.entries(installationCompatibility.mediaByPreset)) {
      for (const renderer of media) {
        const args = [
          'agents',
          'init',
          '--method',
          'packaged',
          '--framework',
          'html',
          '--project',
          'existing',
          '--preset',
          preset,
          ...(preset === 'background-video' ? [] : ['--skin', 'default']),
          '--media',
          renderer,
          '--extensions',
          'none',
          '--source-url',
          'demo',
          '--package-manager',
          'pnpm',
          '--template',
          'vite',
        ];
        const markdown = runAgentsInit('10.0.0', args);
        const first = JSON.parse(runAgentsInit('10.0.0', [...args, '--json']).stdout);
        const rerun = JSON.parse(
          runAgentsInit('10.0.0', [...commandArguments(first.reproduceCommand), '--json']).stdout
        );
        const label = `${preset}/${renderer}`;

        if (!markdown.stdout.includes('Defaulted options: none.')) failures.push(`${label}: defaulted options`);

        if (first.resolvedSourceUrl === 'demo') failures.push(`${label}: unresolved demo source`);

        if (JSON.stringify(rerun.selectedOptions) !== JSON.stringify(first.selectedOptions)) {
          failures.push(`${label}: rerun changed selected options`);
        }

        if (JSON.stringify(rerun.steps) !== JSON.stringify(first.steps)) failures.push(`${label}: rerun changed steps`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('accepts only http(s) source URLs besides the demo keyword', () => {
    for (const source of ['not a url', 'javascript:alert(1)', 'ftp://example.com/video.mp4', '//example.com/a.mp4']) {
      const result = runAgentsInit('10.0.0', ['agents', 'init', '--source-url', source, '--json']);

      expect(result.exitCode, source).toBe(2);
      expect(JSON.parse(result.stdout).errors, source).toEqual([
        expect.objectContaining({ field: '--source-url', message: expect.stringContaining('http:// or https://') }),
      ]);
    }

    expect(runAgentsInit('10.0.0', ['agents', 'init', '--source-url', 'http://example.com/a.mp4']).exitCode).toBe(0);
  });

  it('returns valid framework-specific next links in JSON and Markdown', () => {
    const json = runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'vue', '--json']);
    const markdown = runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'vue']);
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

  it('pins package installs and source media adapters to the requested release', () => {
    const packaged = runAgentsInit(
      '10.0.0-rc.2',
      ['agents', 'init', '--media', 'mux-video', '--package-manager', 'npm'],
      reactProject
    );
    const shadcn = runAgentsInit(
      '10.0.0-rc.2',
      ['agents', 'init', '--method', 'shadcn', '--media', 'hls', '--package-manager', 'npm'],
      reactProject
    );

    expect(packaged.stdout).toContain(
      'npm install @videojs/react@10.0.0-rc.2 @videojs/mux-video@10.0.0-rc.2 @videojs/mux-data@10.0.0-rc.2'
    );
    expect(shadcn.stdout).toContain('npm install @videojs/hlsjs-video@10.0.0-rc.2');
    expect(shadcn.stdout).not.toContain('@videojs/_media-hls');
  });

  it('omits skin from background-video instructions and reproduction commands', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--preset', 'background-video']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('- `skin`:');
    expect(result.stdout).not.toContain('--skin');
  });

  it('covers every framework and installation method in one discovery', () => {
    const markdown = runAgentsInit('10.0.0', ['agents', 'init'], reactProject);
    const json = JSON.parse(runAgentsInit('10.0.0', ['agents', 'init', '--json']).stdout);
    const option = (name: string) => json.options.find(({ flag }: { flag: string }) => flag === name);

    expect(json.package).toBe('@videojs/cli');
    expect(json.command).toBe('npx @videojs/cli@10.0.0 agents init');
    expect(option('--method').values).toEqual(['packaged', 'shadcn', 'cdn']);
    expect(option('--framework').values).toEqual(['react', 'html', 'vue', 'svelte']);
    expect(option('--framework').default).toBe('detected from package.json dependencies; otherwise html');
    expect(Object.keys(json.compatibility.methodsByFramework)).toEqual(['react', 'html', 'vue', 'svelte']);
    expect(json.examples).toEqual([
      expect.stringMatching(/^npx @videojs\/cli@10\.0\.0 agents init --method packaged --framework react /),
      expect.stringMatching(/^npx @videojs\/cli@10\.0\.0 agents init --method shadcn --framework html /),
      expect.stringMatching(/^npx @videojs\/cli@10\.0\.0 agents init --method cdn --framework html /),
    ]);
    expect(markdown.stdout).toContain('Default: react (from package.json dependencies).');
    expect(markdown.stdout).toContain('- `html`: app setups');
    expect(markdown.stdout).toContain('- `svelte`: app setups');
    expect(markdown.stdout).toContain('CDN is plain HTML only');
  });

  it('derives the player package from the framework', () => {
    const react = JSON.parse(runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'react', '--json']).stdout);
    const vue = JSON.parse(runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'vue', '--json']).stdout);

    expect(react).toMatchObject({ package: '@videojs/cli', playerPackage: '@videojs/react' });
    expect(vue).toMatchObject({ package: '@videojs/cli', playerPackage: '@videojs/html' });
  });

  it('lists a detected framework as a defaulted option with its source and pins it in the rerun command', () => {
    const markdown = runAgentsInit('10.0.0', ['agents', 'init', '--media', 'hls'], reactProject);
    const json = JSON.parse(
      runAgentsInit('10.0.0', ['agents', 'init', '--media', 'hls', '--json'], reactProject).stdout
    );
    const explicit = JSON.parse(
      runAgentsInit('10.0.0', ['agents', 'init', '--framework', 'vue', '--json'], reactProject).stdout
    );

    expect(markdown.stdout).toContain('Defaulted options: method, framework (react from package.json dependencies),');
    expect(json.selectedOptions.framework).toBe('react');
    expect(json.defaultedOptions).toContain('framework');
    expect(json.defaultedOptionSources).toEqual({ framework: 'package.json dependencies' });
    expect(json.reproduceCommand).toContain('--framework react');
    expect(explicit.selectedOptions.framework).toBe('vue');
    expect(explicit.defaultedOptions).not.toContain('framework');
    expect(explicit.defaultedOptionSources).toEqual({});
  });

  it('defaults to plain HTML when no framework is detected', () => {
    const json = JSON.parse(runAgentsInit('10.0.0', ['agents', 'init', '--media', 'hls', '--json']).stdout);

    expect(json.selectedOptions.framework).toBe('html');
    expect(json.defaultedOptions).toContain('framework');
    expect(json.defaultedOptionSources).toEqual({});
  });

  it('points at the matching CLI release when the project has another player version', () => {
    const defaults = { ...reactProject, installedVersions: { react: '10.0.0-rc.1', html: '10.0.0' } };
    const args = ['agents', 'init', '--preset', 'audio', '--media', 'html5-audio'];
    const markdown = runAgentsInit('10.0.0', args, defaults);
    const json = JSON.parse(runAgentsInit('10.0.0', [...args, '--json'], defaults).stdout);
    const command = json.reproduceCommand.replace('@videojs/cli@10.0.0 ', '@videojs/cli@10.0.0-rc.1 ');

    expect(json.versionNotice).toEqual({
      package: '@videojs/react',
      installedVersion: '10.0.0-rc.1',
      command,
      message: expect.stringContaining('`@videojs/cli@10.0.0-rc.1` predates `agents init`'),
    });
    expect(command).toContain('--framework react');
    expect(markdown.stdout).toContain(
      `> **Version mismatch.** These instructions target Video.js 10.0.0, but this project has \`@videojs/react@10.0.0-rc.1\`. For instructions that match the installed version, run \`${command}\`.`
    );
    expect(markdown.stdout.indexOf('Version mismatch')).toBeLessThan(markdown.stdout.indexOf('## Selected options'));
  });

  it('omits the version notice when the installed player matches or belongs to the other framework', () => {
    const args = ['agents', 'init', '--framework', 'html', '--json'];
    const matching = JSON.parse(runAgentsInit('10.0.0', args, { installedVersions: { html: '10.0.0' } }).stdout);
    const otherPlayer = JSON.parse(
      runAgentsInit('10.0.0', args, { installedVersions: { react: '10.0.0-rc.1' } }).stdout
    );

    expect(matching.versionNotice).toBeUndefined();
    expect(otherPlayer.versionNotice).toBeUndefined();
    expect(runAgentsInit('10.0.0', args.slice(0, -1), { installedVersions: { html: '10.0.0' } }).stdout).not.toContain(
      'Version mismatch'
    );
  });

  it('renders every supported framework, method, app setup, and starting point without hidden defaults', () => {
    const failures: string[] = [];
    let scenarioCount = 0;

    for (const framework of INSTALLATION_FRAMEWORKS) {
      for (const method of installationMethodsForFramework(framework)) {
        for (const template of installationTemplatesForMethod(framework, method)) {
          const projects = template === 'none' ? (['existing'] as const) : (['new', 'existing'] as const);

          for (const project of projects) {
            scenarioCount += 1;
            const args = [
              'agents',
              'init',
              '--method',
              method,
              '--framework',
              framework,
              '--project',
              project,
              '--preset',
              'video',
              '--skin',
              'default',
              '--media',
              'html5-video',
              '--extensions',
              'none',
              '--source-url',
              INSTALLATION_DEMO_SOURCES.videoMp4,
              '--package-manager',
              'pnpm',
              '--template',
              template,
            ];

            if (method === 'shadcn') {
              args.push('--styling', defaultRegistryStyling(sourceFrameworkFor(framework)));
            }

            const result = runAgentsInit('10.0.0-test', args);
            const jsonResult = runAgentsInit('10.0.0-test', [...args, '--json']);
            const label = `${framework}/${method}/${template}/${project}`;

            if (result.exitCode !== 0 || !result.stdout.includes('Defaulted options: none.')) {
              failures.push(`${label}: ${result.stderr || result.stdout}`);
            }

            if (jsonResult.exitCode !== 0) {
              failures.push(`${label} JSON: ${jsonResult.stderr || jsonResult.stdout}`);
              continue;
            }

            // SAFETY: successful --json output above is produced by installationPlanJson with this stable shape.
            const document = JSON.parse(jsonResult.stdout) as {
              defaultedOptions: string[];
              steps: Array<{ id: string; blocks: Array<{ code: string }> }>;
            };
            const stepIds = document.steps.map(({ id }) => id);
            const code = document.steps.flatMap(({ blocks }) => blocks.map((block) => block.code)).join('\n');

            if (document.defaultedOptions.length > 0) failures.push(`${label}: hidden defaults`);

            if (new Set(stepIds).size !== stepIds.length) failures.push(`${label}: duplicate step IDs`);

            if (document.steps.some(({ blocks }) => blocks.length === 0 || blocks.some((block) => !block.code))) {
              failures.push(`${label}: empty instruction block`);
            }

            if (code.includes('undefined') || code.includes('<app-directory>')) {
              failures.push(`${label}: unresolved generated value`);
            }

            if ((project === 'new') !== stepIds.includes('prepare-app')) {
              failures.push(`${label}: incorrect app preparation`);
            }
          }
        }
      }
    }

    expect(scenarioCount).toBeGreaterThan(40);
    expect(failures).toEqual([]);
  });

  it('returns usage errors with exit code 2', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--method', 'cdn', '--json'], reactProject);
    const value = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(2);
    expect(value.kind).toBe('error');
  });

  it('uses public flags in text validation errors', () => {
    const result = runAgentsInit('10.0.0', ['agents', 'init', '--method', 'cdn', '--template', 'astro']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('- --template: Expected one of: vite, none');
    expect(result.stderr).not.toContain('RegistryTemplate');
  });

  it('attributes CLI syntax errors to arguments rather than an installation option', () => {
    const command = JSON.parse(runAgentsInit('10.0.0', ['install', '--json'], reactProject).stdout);
    const flag = JSON.parse(runAgentsInit('10.0.0', ['agents', 'init', '--wat', '--json'], reactProject).stdout);

    expect(command.errors[0].field).toBe('arguments');
    expect(flag.errors[0].field).toBe('arguments');
    expect(runAgentsInit('10.0.0', ['agents', 'init', 'extra'], reactProject).stderr).toContain(
      'Unexpected argument: extra'
    );
  });
});

describe('detectPackageManager', () => {
  it('uses the nearest project signal before the invoking manager', () => {
    withTemporaryDirectory((root) => {
      const app = join(root, 'apps', 'player');

      mkdirSync(app, { recursive: true });
      writeFileSync(join(root, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.9.2' }));
      writeFileSync(join(app, 'package-lock.json'), '{}');

      expect(detectPackageManager(app, { PATH: '', npm_config_user_agent: 'bun/1.2.0' })).toBe('npm');

      writeFileSync(join(root, 'package.json'), '{}');
      expect(detectPackageManager(app, { PATH: '', npm_config_user_agent: 'bun/1.2.0' })).toBe('npm');

      writeFileSync(join(app, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10.0.0' }));
      expect(detectPackageManager(app, { PATH: '', npm_config_user_agent: 'bun/1.2.0' })).toBe('pnpm');

      rmSync(join(app, 'package.json'));
      rmSync(join(app, 'package-lock.json'));
      expect(detectPackageManager(app, { PATH: '', npm_config_user_agent: 'bun/1.2.0' })).toBe('bun');
    });
  });
});

describe('detectFramework', () => {
  it('reads framework dependencies from the nearest project manifest', () => {
    withTemporaryDirectory((root) => {
      const app = join(root, 'apps', 'player');

      mkdirSync(join(root, '.git'));
      mkdirSync(app, { recursive: true });
      writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { react: '^19.0.0' } }));

      expect(detectFramework(app)).toEqual({ value: 'react', source: 'package.json dependencies' });

      writeFileSync(join(app, 'package.json'), JSON.stringify({ devDependencies: { '@sveltejs/kit': '^2.0.0' } }));
      expect(detectFramework(app)).toEqual({ value: 'svelte', source: 'package.json devDependencies' });

      writeFileSync(join(app, 'package.json'), JSON.stringify({ dependencies: { nuxt: '^4.0.0' } }));
      expect(detectFramework(app)).toEqual({ value: 'vue', source: 'package.json dependencies' });

      writeFileSync(join(app, 'package.json'), JSON.stringify({ dependencies: { next: '^16.0.0', vue: '^3.0.0' } }));
      expect(detectFramework(app)).toEqual({ value: 'react', source: 'package.json dependencies' });

      writeFileSync(join(app, 'package.json'), JSON.stringify({ dependencies: { '@videojs/react': '^10.0.0' } }));
      expect(detectFramework(app)).toEqual({ value: 'react', source: 'package.json dependencies' });

      writeFileSync(join(app, 'package.json'), JSON.stringify({ dependencies: { vite: '^7.0.0' } }));
      expect(detectFramework(app)).toBeNull();
    });
  });
});

describe('detectInstalledPlayerVersions', () => {
  it('prefers installed packages and otherwise uses exact declared versions', () => {
    withTemporaryDirectory((root) => {
      const app = join(root, 'apps', 'player');
      const installedReact = join(root, 'node_modules', '@videojs', 'react');

      mkdirSync(join(root, '.git'));
      mkdirSync(app, { recursive: true });
      mkdirSync(installedReact, { recursive: true });
      writeFileSync(join(installedReact, 'package.json'), JSON.stringify({ version: '10.0.0-rc.1' }));
      writeFileSync(
        join(app, 'package.json'),
        JSON.stringify({ dependencies: { '@videojs/react': '10.0.0-rc.2', '@videojs/html': '10.0.0-rc.1' } })
      );

      expect(detectInstalledPlayerVersions(app)).toEqual({ react: '10.0.0-rc.1', html: '10.0.0-rc.1' });

      writeFileSync(join(app, 'package.json'), JSON.stringify({ dependencies: { '@videojs/html': '^10.0.0-rc.1' } }));
      expect(detectInstalledPlayerVersions(app)).toEqual({ react: '10.0.0-rc.1' });
    });
  });
});
