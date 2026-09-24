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
import { CDN_MEDIA_SUBPATHS, INSTALLATION_DEMO_SOURCES } from './defaults';
import {
  installationCompatibilityFor,
  installationOptionDefinitions,
  type InstallationDiscoveryCompatibility,
  type InstallationOptionDefinition,
} from './options';
import { INSTALLATION_PARAMETERS, type InstallationInput } from './parameters';
import {
  INSTALLATION_TEMPLATE_LABELS,
  installationHtmlEntrySetup,
  installationProjectCreateCommand,
  installationProjectFiles,
  installationProjectFrameworkSetupCommand,
  installationHtmlPageCode,
  installationProjectRunCommand,
  installationReactPlayerCode,
  installationReactUsageCode,
  installationVueConfigFilename,
} from './projects';
import { type InstallationSelection, type PlayerOwner, selectionToInput } from './selection';
import {
  registryNamespaceConfig,
  registrySkinSelection,
  shadcnAddCommand,
  shadcnInitCommand,
  shadcnProjectConfiguration,
} from './shadcn';

export interface InstallationCodeBlock {
  language: string;
  code: string;
  filename?: string;
  operation: 'create' | 'merge' | 'replace' | 'run';
  anchor?: string;
}

export interface InstallationStep {
  id: string;
  title: string;
  description?: string;
  condition?:
    | 'when-components-json-missing'
    | 'when-existing-app'
    | 'when-existing-app-without-components-json'
    | 'when-no-compatible-app';
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
  compatibility: InstallationDiscoveryCompatibility;
  decisionOrder: readonly { title: string; guidance: string }[];
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

export function installationCommand(
  owner: PlayerOwner,
  input?: InstallationInput,
  packageVersion: string | null = null
): string {
  const packageSpecifier = packageVersion ? `${OWNER_PACKAGES[owner]}@${packageVersion}` : OWNER_PACKAGES[owner];
  const parts = [`npx ${packageSpecifier} agents init`];

  if (!input) return parts[0]!;

  for (const { key, flag } of INSTALLATION_PARAMETERS) {
    const value = input[key];

    if (value) parts.push(`${flag} ${shellQuote(value)}`);
  }

  return parts.join(' ');
}

export function createInstallationDiscovery(
  owner: PlayerOwner,
  packageVersion: string,
  defaults: { packageManager?: InstallationSelection['packageManager'] } = {}
): InstallationDiscovery {
  const command = installationCommand(owner, undefined, packageVersion);
  const frameworks = owner === 'react' ? (['react'] as const) : (['html', 'vue', 'svelte'] as const);
  const packageManager = defaults.packageManager ?? 'pnpm';
  const options = installationOptionDefinitions(owner).map((option) =>
    option.flag === '--package-manager' ? { ...option, default: packageManager } : option
  );
  const packagedInput: InstallationInput = {
    method: 'packaged',
    framework: owner === 'react' ? 'react' : 'html',
    template: owner === 'react' ? 'next' : 'vite',
    preset: 'video',
    skin: 'default',
    media: 'mux-video',
    sourceUrl: INSTALLATION_DEMO_SOURCES.videoHls,
    packageManager,
  };
  const shadcnInput: InstallationInput = {
    method: 'shadcn',
    framework: owner === 'react' ? 'react' : 'vue',
    template: owner === 'react' ? 'next' : 'vite',
    preset: 'video',
    skin: 'default',
    media: 'html5-video',
    sourceUrl: INSTALLATION_DEMO_SOURCES.videoMp4,
    packageManager,
    styling: owner === 'react' ? 'tailwind' : 'css',
  };

  return {
    schemaVersion: 1,
    kind: 'discovery',
    package: OWNER_PACKAGES[owner],
    packageVersion,
    command,
    options,
    compatibility: installationCompatibilityFor(frameworks),
    decisionOrder: [
      {
        title: 'Inspect the project',
        guidance:
          'Read package.json, framework config, and lockfiles to infer the framework, app template, and package manager. Use the other Video.js package when the selected framework belongs to it.',
      },
      {
        title: 'Choose the player',
        guidance:
          'Infer the preset from the intended experience when it is clear. Ask when audio, live playback, background video, or the standard video player could all be reasonable.',
      },
      {
        title: 'Choose the skin',
        guidance:
          'Default and Minimal contain the same controls. Minimal uses cleaner surfaces. Ask when the visual direction is not clear.',
      },
      {
        title: 'Choose the media source',
        guidance:
          'Infer the adapter from the source when possible, such as hls for an .m3u8 URL or mux-video for Mux playback.',
      },
      {
        title: 'Choose how to install',
        guidance:
          owner === 'react'
            ? 'Use packaged modules by default or Shadcn when the project should own editable skin source. For Shadcn, use Tailwind styling only when the app already uses Tailwind; otherwise use CSS. Use @videojs/html when the project needs CDN scripts.'
            : 'Use packaged modules by default, Shadcn when the project should own editable skin source, or CDN for a plain HTML integration. CDN can use any existing HTML page or app; only scaffold a minimal Vite app when no app exists. The HTML source registry uses CSS styling.',
      },
      {
        title: 'Return one explicit plan',
        guidance:
          'Confirm the choices once, pass every applicable resolved flag, and check that Defaulted options says none. Adapt conditional setup steps and existing paths before changing files.',
      },
    ],
    examples: [
      installationCommand(owner, packagedInput, packageVersion),
      installationCommand(owner, shadcnInput, packageVersion),
      ...(owner === 'html'
        ? [
            installationCommand(
              owner,
              {
                method: 'cdn',
                framework: 'html',
                template: 'vite',
                preset: 'video',
                skin: 'default',
                media: 'html5-video',
                sourceUrl: INSTALLATION_DEMO_SOURCES.videoMp4,
                packageManager,
              },
              packageVersion
            ),
          ]
        : []),
    ],
    notice:
      owner === 'react'
        ? 'This command prints instructions. Packaged dependencies match this package version; Shadcn copies the current registry source. It never installs packages, prompts, saves preferences, or writes files.'
        : 'This command prints instructions. Packaged and CDN dependencies match this package version; Shadcn copies the current registry source. It never installs packages, prompts, saves preferences, or writes files.',
  };
}

function code(
  language: string,
  value: string,
  filename?: string,
  operation: InstallationCodeBlock['operation'] = filename ? 'merge' : 'run',
  anchor?: string
): InstallationCodeBlock {
  const block: InstallationCodeBlock = { language, code: value, operation };

  if (filename) block.filename = filename;

  if (anchor) block.anchor = anchor;

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

function packageInstallStep(command: string): InstallationStep {
  return { id: 'install', title: 'Install the packages', blocks: [code('bash', command)] };
}

function prepareAppStep(selection: InstallationSelection): InstallationStep {
  return {
    id: 'prepare-app',
    title: 'Prepare your app',
    condition: 'when-no-compatible-app',
    description:
      selection.method === 'cdn'
        ? 'Skip this step when the workspace already has an HTML page or app. When there is no app, scaffold a minimal Vite site in an empty intended app directory, then continue from that directory.'
        : selection.template === 'laravel'
          ? 'Skip this step when the workspace already contains a compatible Laravel app. Otherwise, make sure PHP, Composer, and the Laravel installer are available; run this from the parent directory, replace <app-directory> with a new directory name, and continue from the new app.'
          : `Skip this step when the workspace already contains a compatible ${INSTALLATION_TEMPLATE_LABELS[selection.template]} app. Otherwise, scaffold it in an empty intended app directory, then continue from that directory.`,
    blocks: [
      code('bash', installationProjectCreateCommand(selection.framework, selection.template, selection.packageManager)),
    ],
  };
}

function existingProjectFrameworkStep(selection: InstallationSelection): InstallationStep | null {
  const command = installationProjectFrameworkSetupCommand(
    selection.framework,
    selection.template,
    selection.packageManager
  );
  if (!command) return null;

  return {
    id: 'configure-framework',
    title: 'Configure React in Astro',
    condition: 'when-existing-app',
    description:
      'Run this when adapting an existing Astro app that does not already have the React integration. A newly scaffolded app from the previous step already includes it.',
    blocks: [code('bash', command)],
  };
}

function runAppStep(selection: InstallationSelection): InstallationStep {
  return {
    id: 'run',
    title: 'Run your app',
    description: 'Start the development server and verify that the selected media plays.',
    blocks: [code('bash', installationProjectRunCommand(selection.template, selection.packageManager))],
  };
}

function existingAppPlayerDescription(template: InstallationSelection['template']): string {
  return `Create these files when they are missing. In an existing ${INSTALLATION_TEMPLATE_LABELS[template]} app, merge the example into the route or component that should render the player and preserve unrelated content.`;
}

function createPackagedSteps(selection: InstallationSelection, packageVersion: string): InstallationStep[] {
  const opts = installationOptions(selection);
  const project = installationProjectFiles(selection.framework, selection.template);
  const steps: InstallationStep[] = [prepareAppStep(selection)];
  const frameworkSetup = existingProjectFrameworkStep(selection);

  if (frameworkSetup) steps.push(frameworkSetup);

  if (selection.framework === 'react') {
    const install = generateReactInstallCode(opts, packageVersion);
    const player = generateReactCreateCode(opts);

    steps.push(packageInstallStep(install[selection.packageManager]), {
      id: 'player',
      title: 'Add your player',
      description: existingAppPlayerDescription(selection.template),
      blocks: [code('tsx', installationReactPlayerCode(player['app/page.tsx'], selection.template), project.player)],
    });

    if (project.usage) {
      steps.at(-1)!.blocks = [
        ...steps.at(-1)!.blocks,
        code('astro', installationReactUsageCode(selection.template)!, project.usage),
      ];
    }

    steps.push(runAppStep(selection));

    return steps;
  }

  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS, selection.cdnBase, packageVersion);

  if (selection.framework === 'vue') {
    const config = generateVueCustomElementConfigCode(opts);
    const component = generateVueCreateCode(opts);
    const usage = generateVueUsageCode({ ...opts, playerImport: project.playerImport });

    steps.push(
      packageInstallStep(install[selection.packageManager]),
      {
        id: 'configure',
        title: 'Register the custom elements',
        description: 'Use the file that matches your Vue toolchain.',
        blocks: [code('ts', config[installationVueConfigFilename(selection.template)], project.config)],
      },
      {
        id: 'player',
        title: 'Add your player',
        description: existingAppPlayerDescription(selection.template),
        blocks: [
          code('vue', component['MediaPlayer.vue'], project.player),
          code('vue', usage['App.vue'], project.usage),
        ],
      }
    );
    steps.push(runAppStep(selection));

    return steps;
  }

  if (selection.framework === 'svelte') {
    const component = generateSvelteCreateCode(opts);
    const usage = generateSvelteUsageCode(opts);

    steps.push(packageInstallStep(install[selection.packageManager]), {
      id: 'player',
      title: 'Add your player',
      description: existingAppPlayerDescription(selection.template),
      blocks: [
        code('svelte', component['VideoPlayer.svelte'], project.player),
        code('svelte', selection.template === 'sveltekit' ? usage['+page.svelte'] : usage['App.svelte'], project.usage),
      ],
    });
    steps.push(runAppStep(selection));

    return steps;
  }

  const usage = generateHTMLUsageCode(opts);
  const entrySetup = installationHtmlEntrySetup(selection.template, project.usage!);
  const blocks = [
    ...(usage.imports ? [code('ts', usage.imports, project.usage)] : []),
    code('html', installationHtmlPageCode(usage.html, selection.template, project.usage!), project.player),
  ];

  steps.push(packageInstallStep(install[selection.packageManager]));

  if (entrySetup.length > 0) {
    steps.push({
      id: 'configure-app-entry',
      title: 'Configure your app entry',
      description: `Merge the generated player entry into the existing ${entrySetup[0]!.filename} configuration. Keep every existing input, plugin, and option.`,
      blocks: entrySetup.map((block) => code(block.language, block.code, block.filename)),
    });
  }

  steps.push({
    id: 'player',
    title: 'Add your player',
    description: existingAppPlayerDescription(selection.template),
    blocks,
  });
  steps.push(runAppStep(selection));

  return steps;
}

function createCdnSteps(selection: InstallationSelection): InstallationStep[] {
  const opts = installationOptions(selection);
  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS, selection.cdnBase);
  const usage = generateHTMLUsageCode(opts);

  return [
    prepareAppStep(selection),
    {
      id: 'load',
      title: 'Load Video.js',
      description: 'Add these module scripts to the page head or before the closing body tag.',
      blocks: [code('html', install.cdn, 'index.html')],
    },
    {
      id: 'player',
      title: 'Add your player',
      description: 'Add this markup inside the page body where the player should appear.',
      blocks: [code('html', usage.html, 'index.html')],
    },
    { ...runAppStep(selection), condition: 'when-no-compatible-app' },
  ];
}

function createShadcnSteps(selection: InstallationSelection, packageVersion: string): InstallationStep[] {
  const opts = installationOptions(selection);
  const registry = registrySkinSelection({ useCase: selection.useCase, skin: selection.skin });
  if (!registry || !selection.styling) throw new Error('Invalid Shadcn selection');

  const project = installationProjectFiles(selection.framework, selection.template);
  const configuration = shadcnProjectConfiguration(
    selection.framework,
    selection.template,
    selection.styling,
    project.componentsAlias
  );
  const steps: InstallationStep[] = [];
  const frameworkSetup = existingProjectFrameworkStep(selection);

  if (configuration.mode === 'shadcn-init') {
    steps.push({
      id: 'prepare-app',
      title: 'Prepare your app',
      condition: 'when-no-compatible-app',
      description: `Run this from the parent directory when the workspace does not already contain a compatible ${INSTALLATION_TEMPLATE_LABELS[selection.template]} app. Replace <app-directory> with a new directory name. Shadcn creates the app and components.json together, then the command enters the new app.`,
      blocks: [code('bash', shadcnInitCommand(selection.packageManager, selection.template))],
    });

    if (frameworkSetup) steps.push(frameworkSetup);

    steps.push({
      id: 'configure-source-registry',
      title: 'Configure the source registry',
      condition: 'when-existing-app-without-components-json',
      description:
        'Run this only for an existing compatible app that already uses Tailwind CSS but does not have components.json. Commit the app first because Shadcn init can update dependencies, global CSS, and utility files. Merge any missing alias configuration below first, keep the app’s existing plugins and compiler options, then initialize Shadcn non-interactively. If the app does not use Tailwind, rerun agents init with --styling css. If components.json already exists, skip this step.',
      blocks: [
        ...configuration.aliasSetup.map((block) => code(block.language, block.code, block.filename)),
        code('bash', shadcnInitCommand(selection.packageManager)),
      ],
    });
  } else {
    steps.push(prepareAppStep(selection));

    if (frameworkSetup) steps.push(frameworkSetup);

    steps.push({
      id: 'configure-source-registry',
      title: 'Configure the source registry',
      condition: 'when-components-json-missing',
      description: `Skip this step when components.json already uses the standard https://ui.shadcn.com/schema.json schema; preserve that file and its aliases. Otherwise, merge every app-alias block below, then create the standard config in the app directory. When converting a framework-specific Shadcn config, keep its alias values but use the standard schema. The generated components alias maps registry files to ${project.componentsDirectory}. Commit your work first so every added or replaced file is reviewable.`,
      blocks: [
        ...configuration.aliasSetup.map((block) => code(block.language, block.code, block.filename)),
        code('json', configuration.componentsConfig!, 'components.json', 'create'),
      ],
    });
  }

  steps.push({
    id: 'skin-source',
    title: 'Add the skin source',
    description:
      'Commit current source first. Merge the selected @videojs catalog into components.json, replacing its existing @videojs value if necessary. The add command overwrites an existing Video.js skin so catalog and theme changes fully apply. Review and remove obsolete Video.js style files left by a previous catalog. For HTML source, the later media step restores the selected media element after an overwrite.',
    blocks: [
      code(
        'json',
        registryNamespaceConfig(selection.sourceFramework, selection.styling, registry.theme),
        'components.json'
      ),
      code('bash', shadcnAddCommand(selection.packageManager, [registry.item])),
    ],
  });

  const mediaInstall = generateSourceMediaInstallCode(selection.media, packageVersion);

  if (mediaInstall) {
    steps.push({
      id: 'media-adapter',
      title: 'Install the media adapter',
      description:
        'This media source needs a separate playback adapter. Install the package version that matches these instructions.',
      blocks: [code('bash', mediaInstall[selection.packageManager])],
    });
  }

  if (selection.framework === 'html' && project.usage) {
    const entrySetup = installationHtmlEntrySetup(selection.template, project.usage);

    if (entrySetup.length > 0) {
      steps.push({
        id: 'configure-app-entry',
        title: 'Configure your app entry',
        description: `Merge the generated player entry into the existing ${entrySetup[0]!.filename} configuration. Keep every existing input, plugin, and option.`,
        blocks: entrySetup.map((block) => code(block.language, block.code, block.filename)),
      });
    }
  }

  if (selection.framework === 'react') {
    const player = generateSourceReactCreateCode({ ...opts, componentsAlias: project.componentsAlias });

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Use the aliases.components value from components.json in the skin import when it differs from the generated ${project.componentsAlias} path. ${existingAppPlayerDescription(selection.template)}`,
      blocks: [code('tsx', installationReactPlayerCode(player['app/page.tsx'], selection.template), project.player)],
    });

    if (project.usage) {
      steps.at(-1)!.blocks = [
        ...steps.at(-1)!.blocks,
        code('astro', installationReactUsageCode(selection.template)!, project.usage),
      ];
    }

    steps.push(runAppStep(selection));

    return steps;
  }

  if (selection.framework === 'vue') {
    const player = generateSourceVueUsageCode({
      ...opts,
      componentsAlias: project.componentsAlias,
      componentsDirectory: project.componentsDirectory,
      playerImport: project.playerImport,
    });

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Replace the <!-- Add a compatible media element here. --> placeholder in ${player.skinFile} with the media snippet below. Merge the matching isCustomElement option into your existing Vue config, keeping its other plugins and aliases. The component imports the updated local skin as raw HTML so Vue leaves its internal templates intact.`,
      blocks: [
        code('ts', player[installationVueConfigFilename(selection.template)], project.config),
        code('html', player.media, player.skinFile, 'replace', '<!-- Add a compatible media element here. -->'),
        code('vue', player['MediaPlayer.vue'], project.player),
        code('vue', player['App.vue'], project.usage),
      ],
    });
    steps.push(runAppStep(selection));

    return steps;
  }

  if (selection.framework === 'svelte') {
    const player = generateSourceSvelteUsageCode({
      ...opts,
      componentsAlias: project.componentsImportAlias ?? project.componentsAlias,
      componentsDirectory: project.componentsDirectory,
    });

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Replace the <!-- Add a compatible media element here. --> placeholder in ${player.skinFile} with the media snippet below. The component imports the updated local skin as raw HTML. The final file shown matches the selected ${INSTALLATION_TEMPLATE_LABELS[selection.template]} app.`,
      blocks: [
        code('html', player.media, player.skinFile, 'replace', '<!-- Add a compatible media element here. -->'),
        code('svelte', player['VideoPlayer.svelte'], project.player),
        code(
          'svelte',
          selection.template === 'sveltekit' ? player['+page.svelte'] : player['App.svelte'],
          project.usage
        ),
      ],
    });
    steps.push(runAppStep(selection));

    return steps;
  }

  const player = generateSourceHTMLUsageCode({
    ...opts,
    componentsAlias: project.componentsAlias,
    componentsDirectory: project.componentsDirectory,
  });

  steps.push({
    id: 'player',
    title: 'Add your player',
    description: `Replace the <!-- Add a compatible media element here. --> placeholder in ${player.skinFile} with the media snippet below. Then paste the complete updated skin markup into the player where indicated. ${existingAppPlayerDescription(selection.template)}`,
    blocks: [
      code('html', player.media, player.skinFile, 'replace', '<!-- Add a compatible media element here. -->'),
      code('ts', player.imports, project.usage),
      code('html', installationHtmlPageCode(player.player, selection.template, project.usage!), project.player),
    ],
  });
  steps.push(runAppStep(selection));

  return steps;
}

export function createInstallationPlan(selection: InstallationSelection, packageVersion: string): InstallationPlan {
  const resolvedSourceUrl = resolveInstallationSourceUrl(selection.sourceUrl, selection.media, selection.useCase);
  const explicit = selectionToInput({ ...selection, sourceUrl: resolvedSourceUrl });
  const relevantInput: InstallationInput = {
    method: explicit.method,
    framework: explicit.framework,
    preset: explicit.preset,
    media: explicit.media,
    sourceUrl: explicit.sourceUrl,
  };

  if (selection.useCase !== 'background-video') relevantInput.skin = explicit.skin;

  relevantInput.packageManager = explicit.packageManager;
  relevantInput.template = explicit.template;

  if (selection.method === 'shadcn') {
    relevantInput.styling = explicit.styling;
  }

  const steps =
    selection.method === 'cdn'
      ? createCdnSteps(selection)
      : selection.method === 'shadcn'
        ? createShadcnSteps(selection, packageVersion)
        : createPackagedSteps(selection, packageVersion);
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
    notice:
      selection.method === 'shadcn'
        ? 'These are instructions only. Review and run the commands in your project; no files were modified. Shadcn copies the current Video.js registry source, while package installs use the version shown above.'
        : 'These are instructions only. Review and run the commands in your project; no files were modified.',
  };
}
