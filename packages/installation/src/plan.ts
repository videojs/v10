import {
  generateHTMLInstallCode,
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  generateSourceHTMLUsageCode,
  generateSourceMediaInstallCode,
  generateSourceReactCreateCode,
  generateSourceSvelteUsageCode,
  generateSourceVueUsageCode,
  generateSvelteCreateCode,
  generateSvelteUsageCode,
  generateVueCreateCode,
  generateVueCustomElementConfigCode,
  generateVueUsageCode,
  resolveInstallationSourceUrl,
  type InstallationOptions,
} from './codegen';
import { CDN_MEDIA_SUBPATHS } from './defaults';
import {
  installationCompatibility,
  installationOptionDefinitions,
  type InstallationCompatibility,
  type InstallationOptionDefinition,
} from './options';
import { type InstallationInput, type InstallationSelection, type PlayerOwner, selectionToInput } from './selection';
import { registryInstallCommands, registrySkinSelection, shadcnInitCommand } from './shadcn';

export interface InstallationCodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface InstallationStep {
  id: string;
  title: string;
  description?: string;
  blocks: readonly InstallationCodeBlock[];
}

export interface InstallationPlan {
  schemaVersion: 1;
  kind: 'instructions';
  package: '@videojs/html' | '@videojs/react';
  packageVersion: string;
  selection: InstallationSelection;
  resolvedSourceUrl: string;
  reproduceCommand: string;
  steps: readonly InstallationStep[];
  next: readonly { label: string; url: string }[];
  notice: string;
}

export interface InstallationDiscovery {
  schemaVersion: 1;
  kind: 'discovery';
  package: '@videojs/html' | '@videojs/react';
  packageVersion: string;
  command: string;
  options: readonly InstallationOptionDefinition[];
  compatibility: InstallationCompatibility;
  examples: readonly string[];
  notice: string;
}

const OWNER_PACKAGES = {
  html: '@videojs/html',
  react: '@videojs/react',
} as const;

function shellQuote(value: string): string {
  return /^[a-z0-9_./:@-]+$/i.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}

export function installationCommand(owner: PlayerOwner, input?: InstallationInput, packageVersion = 'latest'): string {
  const parts = [`npx ${OWNER_PACKAGES[owner]}@${packageVersion} agents init`];

  if (!input) return parts[0]!;

  const flags: Array<[keyof InstallationInput, string]> = [
    ['method', '--method'],
    ['framework', '--framework'],
    ['preset', '--preset'],
    ['skin', '--skin'],
    ['media', '--media'],
    ['sourceUrl', '--source-url'],
    ['packageManager', '--package-manager'],
    ['template', '--template'],
    ['styling', '--styling'],
  ];

  for (const [key, flag] of flags) {
    const value = input[key];

    if (value) parts.push(`${flag} ${shellQuote(value)}`);
  }

  return parts.join(' ');
}

export function createInstallationDiscovery(owner: PlayerOwner, packageVersion: string): InstallationDiscovery {
  const command = installationCommand(owner, undefined, packageVersion);

  return {
    schemaVersion: 1,
    kind: 'discovery',
    package: OWNER_PACKAGES[owner],
    packageVersion,
    command,
    options: installationOptionDefinitions(owner),
    compatibility: installationCompatibility,
    examples: [
      `${command} --method packaged --preset video --media hls --package-manager pnpm`,
      owner === 'react'
        ? `${command} --method shadcn --template next --styling tailwind`
        : `${command} --framework vue --method shadcn --template vite --styling css`,
      ...(owner === 'html' ? [`${command} --method cdn --framework html --preset video`] : []),
    ],
    notice:
      'This command prints version-matched instructions. It never installs packages, prompts, saves preferences, or writes files.',
  };
}

function code(language: string, value: string, filename?: string): InstallationCodeBlock {
  const block: InstallationCodeBlock = { language, code: value };

  if (filename) block.filename = filename;

  return block;
}

function installationOptions(selection: InstallationSelection): InstallationOptions {
  return {
    framework: selection.sourceFramework,
    useCase: selection.useCase,
    skin: selection.skin,
    renderer: selection.media,
    sourceUrl: selection.sourceUrl,
    installMethod: selection.method === 'cdn' ? 'cdn' : selection.packageManager,
  };
}

function createPackagedSteps(selection: InstallationSelection): InstallationStep[] {
  const opts = installationOptions(selection);

  if (selection.framework === 'react') {
    const install = generateReactInstallCode(opts);
    const player = generateReactCreateCode(opts);

    return [
      { id: 'install', title: 'Install the packages', blocks: [code('bash', install[selection.packageManager])] },
      {
        id: 'player',
        title: 'Add your player',
        description: 'Add the player to your app page.',
        blocks: [code('tsx', player['app/page.tsx'], 'app/page.tsx')],
      },
    ];
  }

  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS, selection.cdnBase);

  if (selection.framework === 'vue') {
    const config = generateVueCustomElementConfigCode(opts);
    const component = generateVueCreateCode(opts);
    const usage = generateVueUsageCode(opts);

    return [
      { id: 'install', title: 'Install the packages', blocks: [code('bash', install[selection.packageManager])] },
      {
        id: 'configure',
        title: 'Register the custom elements',
        description: 'Use the file that matches your Vue toolchain.',
        blocks: [
          code('ts', config['vite.config.ts'], 'vite.config.ts'),
          code('ts', config['nuxt.config.ts'], 'nuxt.config.ts'),
        ],
      },
      {
        id: 'player',
        title: 'Add your player',
        blocks: [
          code('vue', component['VideoPlayer.vue'], 'components/VideoPlayer.vue'),
          code('vue', usage['App.vue'], 'App.vue'),
        ],
      },
    ];
  }

  if (selection.framework === 'svelte') {
    const component = generateSvelteCreateCode(opts);
    const usage = generateSvelteUsageCode(opts);

    return [
      { id: 'install', title: 'Install the packages', blocks: [code('bash', install[selection.packageManager])] },
      {
        id: 'player',
        title: 'Add your player',
        blocks: [
          code('svelte', component['VideoPlayer.svelte'], 'src/lib/VideoPlayer.svelte'),
          code('svelte', usage['+page.svelte'], 'src/routes/+page.svelte'),
          code('svelte', usage['App.svelte'], 'src/App.svelte'),
        ],
      },
    ];
  }

  const usage = generateHTMLUsageCode(opts);
  const blocks = [
    ...(usage.imports ? [code('ts', usage.imports, 'src/player.ts')] : []),
    code('html', usage.html, 'index.html'),
  ];

  return [
    { id: 'install', title: 'Install the packages', blocks: [code('bash', install[selection.packageManager])] },
    { id: 'player', title: 'Add your player', blocks },
  ];
}

function createCdnSteps(selection: InstallationSelection): InstallationStep[] {
  const opts = installationOptions(selection);
  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS, selection.cdnBase);
  const usage = generateHTMLUsageCode(opts);

  return [
    { id: 'load', title: 'Load Video.js', blocks: [code('html', install.cdn, 'index.html')] },
    { id: 'player', title: 'Add your player', blocks: [code('html', usage.html, 'index.html')] },
  ];
}

function createShadcnSteps(selection: InstallationSelection): InstallationStep[] {
  const opts = installationOptions(selection);
  const registry = registrySkinSelection({ useCase: selection.useCase, skin: selection.skin });
  if (!registry || !selection.template || !selection.styling) throw new Error('Invalid Shadcn selection');

  const steps: InstallationStep[] = [
    {
      id: 'initialize',
      title: 'Initialize Shadcn',
      description:
        'Run commands from the app directory that contains components.json, or where it should be created. In a monorepo, use the app workspace or pass --cwd <path>. Commit your work first so every added or replaced file is reviewable. Skip this step if components.json already exists.',
      blocks: [code('bash', shadcnInitCommand(selection.packageManager, selection.template))],
    },
    {
      id: 'skin-source',
      title: 'Add the skin source',
      blocks: [
        code(
          'bash',
          registryInstallCommands(
            selection.packageManager,
            selection.sourceFramework,
            selection.styling,
            [registry.item],
            registry.theme
          )
        ),
      ],
    },
  ];

  const adapter = generateSourceMediaInstallCode(selection.media);

  if (adapter) {
    steps.push({
      id: 'media-adapter',
      title: 'Install the media adapter',
      description: 'This media source needs a separate playback adapter.',
      blocks: [code('bash', adapter[selection.packageManager])],
    });
  }

  if (selection.framework === 'react') {
    const player = generateSourceReactCreateCode(opts);

    steps.push({
      id: 'player',
      title: 'Add your player',
      blocks: [code('tsx', player['app/page.tsx'], 'app/page.tsx')],
    });

    return steps;
  }

  if (selection.framework === 'vue') {
    const player = generateSourceVueUsageCode(opts);

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Replace the media placeholder in ${player.skinFile} with the media snippet below. Then paste the complete updated skin markup into the component where indicated. The Vue configuration recognizes both the player and every custom element in the copied skin.`,
      blocks: [
        code('ts', player['vite.config.ts'], 'vite.config.ts'),
        code('ts', player['nuxt.config.ts'], 'nuxt.config.ts'),
        code('html', player.media, player.skinFile),
        code('vue', player['VideoPlayer.vue'], 'components/VideoPlayer.vue'),
        code('vue', player['App.vue'], 'App.vue'),
      ],
    });

    return steps;
  }

  if (selection.framework === 'svelte') {
    const player = generateSourceSvelteUsageCode(opts);

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Replace the media placeholder in ${player.skinFile} with the media snippet below. Then paste the complete updated skin markup into the component where indicated. Use the page example for SvelteKit or the App example for a Vite app.`,
      blocks: [
        code('html', player.media, player.skinFile),
        code('svelte', player['VideoPlayer.svelte'], 'src/lib/VideoPlayer.svelte'),
        code('svelte', player['+page.svelte'], 'src/routes/+page.svelte'),
        code('svelte', player['App.svelte'], 'src/App.svelte'),
      ],
    });

    return steps;
  }

  const player = generateSourceHTMLUsageCode(opts);

  steps.push({
    id: 'player',
    title: 'Add your player',
    description: `Replace the media placeholder in ${player.skinFile} with the media snippet below. Then paste the complete updated skin markup into the player where indicated.`,
    blocks: [
      code('html', player.media, player.skinFile),
      code('ts', player.imports, 'src/player.ts'),
      code('html', player.player, 'index.html'),
    ],
  });

  return steps;
}

export function createInstallationPlan(selection: InstallationSelection, packageVersion: string): InstallationPlan {
  const resolvedSourceUrl = resolveInstallationSourceUrl(selection.sourceUrl, selection.media, selection.useCase);
  const explicit = selectionToInput({ ...selection, sourceUrl: resolvedSourceUrl });
  const relevantInput: InstallationInput = {
    method: explicit.method,
    framework: explicit.framework,
    preset: explicit.preset,
    skin: explicit.skin,
    media: explicit.media,
    sourceUrl: explicit.sourceUrl,
  };

  if (selection.method !== 'cdn') relevantInput.packageManager = explicit.packageManager;

  if (selection.method === 'shadcn') {
    relevantInput.template = explicit.template;
    relevantInput.styling = explicit.styling;
  }

  const steps =
    selection.method === 'cdn'
      ? createCdnSteps(selection)
      : selection.method === 'shadcn'
        ? createShadcnSteps(selection)
        : createPackagedSteps(selection);
  const docsFramework = selection.framework === 'react' ? 'react' : 'html';

  return {
    schemaVersion: 1,
    kind: 'instructions',
    package: OWNER_PACKAGES[selection.owner],
    packageVersion,
    selection: { ...selection, sourceUrl: resolvedSourceUrl },
    resolvedSourceUrl,
    reproduceCommand: installationCommand(selection.owner, relevantInput, packageVersion),
    steps,
    next: [
      {
        label: 'Customize skins',
        url: `https://videojs.org/docs/framework/${docsFramework}/guides/customize-skins`,
      },
      {
        label: 'Browser support',
        url: `https://videojs.org/docs/framework/${docsFramework}/guides/browser-support`,
      },
    ],
    notice: 'These are instructions only. Review and run the commands in your project; no files were modified.',
  };
}
