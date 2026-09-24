import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { INSTALLATION_DEMO_SOURCES } from '../defaults';
import { detectPackageManager, runAgentsInit } from '../node';
import { installationCommand } from '../plan';
import {
  INSTALLATION_FRAMEWORKS,
  installationMethodsForFramework,
  installationTemplatesForMethod,
  sourceFrameworkFor,
} from '../selection';
import { defaultRegistryStyling } from '../shadcn';

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

  it('uses the detected package manager and gives fully explicit examples', () => {
    const discovery = JSON.parse(
      runAgentsInit('html', '10.0.0', ['agents', 'init', '--json'], { packageManager: 'yarn' }).stdout
    );
    const packageManager = discovery.options.find(({ flag }: { flag: string }) => flag === '--package-manager');

    expect(packageManager.default).toBe('yarn');

    // SAFETY: discovery JSON is produced by createInstallationDiscovery, whose examples field is a string array.
    for (const example of discovery.examples as string[]) {
      const args = example.split(' ').slice(2);
      const result = runAgentsInit('html', '10.0.0', args);

      expect(result.exitCode, example).toBe(0);
      expect(result.stdout, example).toContain('Defaulted options: none.');
    }
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
    expect(result.stdout).toContain('## Configure Shadcn');
    expect(result.stdout).toContain(
      'pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
    expect(result.stdout).toContain('Shadcn skips configured namespaces');
    expect(result.stdout).toContain('## Install the media adapter');
    expect(result.stdout).toContain('pnpm add @videojs/hlsjs-video@10.0.0');
    expect(result.stdout).toContain('vite.config.ts');
    expect(result.stdout).toContain("tag.startsWith('media-')");
    expect(result.stdout).toContain('components/VideoPlayer.vue');
    expect(result.stdout).not.toContain('### `index.html`');
  });

  it('uses an existing HTML setup without inventing scaffold or run commands', () => {
    const result = runAgentsInit('html', '10.0.0', [
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
    const result = runAgentsInit('react', '10.0.0', [
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
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('## Prepare');
    expect(result.stdout).toContain('## Run your app');
    expect(result.stdout).toContain('pnpm dev');
    expect(result.stdout).not.toContain('Continue in the existing');
  });

  it('uses Svelte component files for Shadcn HTML source', () => {
    const result = runAgentsInit('html', '10.0.0', [
      'agents',
      'init',
      '--framework',
      'svelte',
      '--method',
      'shadcn',
      '--template',
      'sveltekit',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('src/lib/VideoPlayer.svelte');
    expect(result.stdout).toContain('src/routes/+page.svelte');
    expect(result.stdout).toContain("import VideoSkin from '$lib/components/videojs/video/skin.svelte'");
    expect(result.stdout).not.toContain("import '#lib/components/videojs/video/skin'");
    expect(result.stdout).toContain('<slot />');
    expect(result.stdout).toContain('<style>');
    expect(result.stdout).not.toContain('## Register custom elements');
    expect(result.stdout).toContain('<video src={"https://stream.mux.com/');
    expect(result.stdout).not.toContain('### `index.html`');
  });

  it('lets Shadcn scaffold a new React Tailwind app without double scaffolding', () => {
    const result = runAgentsInit('react', '10.0.0', [
      'agents',
      'init',
      '--method',
      'shadcn',
      '--project',
      'new',
      '--template',
      'vite',
      '--styling',
      'tailwind',
    ]);

    expect(result.stdout).toContain('pnpm dlx shadcn@latest init --template vite');
    expect(result.stdout).not.toContain('pnpm dlx shadcn@latest init --base base --preset nova --yes');
    expect(result.stdout).not.toContain('# Optional: run if components.json does not exist.');
    expect(result.stdout).not.toContain('pnpm create vite');
  });

  it('keeps alias-free Shadcn initialization with the registry commands', () => {
    const result = runAgentsInit('react', '10.0.0', [
      'agents',
      'init',
      '--method',
      'shadcn',
      '--project',
      'existing',
      '--template',
      'next',
      '--styling',
      'tailwind',
    ]);

    expect(result.stdout).not.toContain('## Configure Shadcn');
    expect(result.stdout).toContain('## Create components.json (optional)');
    expect(result.stdout).toContain('## Add the Video.js Registry');
    expect(result.stdout).toContain('## Add the skin source');
    expect(result.stdout).toContain('# Optional: run if components.json does not exist.');
    expect(result.stdout).toContain('pnpm dlx shadcn@latest init --base base --preset nova --yes');
  });

  it('writes Shadcn aliases where Vite and Shadcn both resolve them', () => {
    const result = runAgentsInit('react', '10.0.0', [
      'agents',
      'init',
      '--method',
      'shadcn',
      '--template',
      'vite',
      '--styling',
      'css',
    ]);

    expect(result.stdout).toContain('### `tsconfig.json`');
    expect(result.stdout).toContain('### `tsconfig.app.json`');
    expect(result.stdout).toContain('"tsx": true');
    expect(result.stdout).not.toContain('"baseUrl"');
  });

  it('uses Astro and Laravel entry conventions for HTML apps', () => {
    const astro = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'html', '--template', 'astro']);
    const laravel = runAgentsInit('html', '10.0.0', [
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
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--method', 'cdn', '--project', 'new']);

    expect(result.stdout).toContain('## Create the app');
    expect(result.stdout).toContain('pnpm create vite');
    expect(result.stdout).toContain('## Run your app');
    expect(result.stdout).toContain('Scaffold a minimal Vite site');
    expect(result.stdout).toContain('page head or before the closing body tag');
    expect(result.stdout).toContain('inside the page body');
  });

  it('keeps packaged and Shadcn Nuxt player markup on the client', () => {
    const shadcn = runAgentsInit('html', '10.0.0', [
      'agents',
      'init',
      '--method',
      'shadcn',
      '--framework',
      'vue',
      '--template',
      'nuxt',
    ]);
    const packaged = runAgentsInit('html', '10.0.0', ['agents', 'init', '--framework', 'vue', '--template', 'nuxt']);

    for (const result of [packaged, shadcn]) {
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('app/components/VideoPlayer.client.vue');
      expect(result.stdout).toContain("import { VideoPlayer } from '#components'");
      expect(result.stdout).not.toContain("from './components/VideoPlayer.client.vue'");
    }
  });

  it('does not add framework setup instructions to an existing Astro app', () => {
    const result = runAgentsInit('react', '10.0.0', [
      'agents',
      'init',
      '--method',
      'shadcn',
      '--template',
      'astro',
      '--json',
    ]);
    // SAFETY: runAgentsInit produced instruction JSON above, whose steps expose stable string IDs.
    const steps = JSON.parse(result.stdout).steps as Array<{ id: string }>;

    expect(result.exitCode).toBe(0);
    expect(steps.some(({ id }) => id === 'configure-framework')).toBe(false);
  });

  it('re-runs the generated native-audio command without changing its selection', () => {
    const first = JSON.parse(
      runAgentsInit('html', '10.0.0', ['agents', 'init', '--preset', 'audio', '--media', 'html5-audio', '--json'])
        .stdout
    );
    const args = first.reproduceCommand.split(' ').slice(2);
    const reproduced = runAgentsInit('html', '10.0.0', [...args, '--json']);

    expect(reproduced.exitCode).toBe(0);
    expect(JSON.parse(reproduced.stdout).selectedOptions).toEqual(first.selectedOptions);
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

  it('exposes public option names without internal selection fields in instruction JSON', () => {
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--preset', 'background-video', '--json']);
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
    const discovery = JSON.parse(runAgentsInit('react', '10.0.0', ['--help', '--json']).stdout);
    const bareJson = JSON.parse(runAgentsInit('react', '10.0.0', ['--json']).stdout);
    const version = JSON.parse(runAgentsInit('react', '10.0.0', ['agents', 'init', '--version', '--json']).stdout);
    const topLevelVersion = JSON.parse(runAgentsInit('react', '10.0.0', ['--version', '--json']).stdout);

    expect(discovery.kind).toBe('discovery');
    expect(bareJson.kind).toBe('discovery');
    expect(version).toMatchObject({ kind: 'version', package: '@videojs/react', packageVersion: '10.0.0' });
    expect(topLevelVersion).toEqual(version);
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

  it('pins package installs and source media adapters to the requested release', () => {
    const packaged = runAgentsInit('react', '10.0.0-rc.2', [
      'agents',
      'init',
      '--media',
      'mux-video',
      '--package-manager',
      'npm',
    ]);
    const shadcn = runAgentsInit('react', '10.0.0-rc.2', [
      'agents',
      'init',
      '--method',
      'shadcn',
      '--media',
      'hls',
      '--package-manager',
      'npm',
    ]);

    expect(packaged.stdout).toContain(
      'npm install @videojs/react@10.0.0-rc.2 @videojs/mux-video@10.0.0-rc.2 @videojs/mux-data@10.0.0-rc.2'
    );
    expect(shadcn.stdout).toContain('npm install @videojs/hlsjs-video@10.0.0-rc.2');
    expect(shadcn.stdout).not.toContain('@videojs/_media-hls');
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
    expect(json.compatibility.templatesByFramework).toEqual({
      react: ['next', 'vite', 'start', 'react-router', 'astro', 'laravel'],
    });
    expect(markdown.stdout).not.toContain('- `html`: templates');
    expect(markdown.stdout).not.toContain('CDN is plain HTML only');
  });

  it('renders every supported framework, method, app setup, and starting point without hidden defaults', () => {
    const failures: string[] = [];
    let scenarioCount = 0;

    for (const framework of INSTALLATION_FRAMEWORKS) {
      const owner = framework === 'react' ? 'react' : 'html';

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

            const result = runAgentsInit(owner, '10.0.0-test', args);
            const jsonResult = runAgentsInit(owner, '10.0.0-test', [...args, '--json']);
            const label = `${owner}/${framework}/${method}/${template}/${project}`;

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
    const result = runAgentsInit('react', '10.0.0', ['agents', 'init', '--method', 'cdn', '--json']);
    const value = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(2);
    expect(value.kind).toBe('error');
  });

  it('uses public flags in text validation errors', () => {
    const result = runAgentsInit('html', '10.0.0', ['agents', 'init', '--method', 'cdn', '--template', 'astro']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('- --template: Expected one of: vite, none');
    expect(result.stderr).not.toContain('RegistryTemplate');
  });

  it('attributes CLI syntax errors to arguments rather than an installation option', () => {
    const command = JSON.parse(runAgentsInit('react', '10.0.0', ['install', '--json']).stdout);
    const flag = JSON.parse(runAgentsInit('react', '10.0.0', ['agents', 'init', '--wat', '--json']).stdout);

    expect(command.errors[0].field).toBe('arguments');
    expect(flag.errors[0].field).toBe('arguments');
    expect(runAgentsInit('react', '10.0.0', ['agents', 'init', 'extra']).stderr).toContain(
      'Unexpected argument: extra'
    );
  });
});

describe('detectPackageManager', () => {
  it('uses the nearest project signal before the invoking manager', () => {
    const root = mkdtempSync(join(tmpdir(), 'videojs-installation-'));
    const app = join(root, 'apps', 'player');

    try {
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
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
