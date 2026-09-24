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
  installationDecisionOrderFor,
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
  installationHtmlPageCode,
  installationProjectRunCommand,
  installationReactPlayerCode,
  installationReactUsageCode,
  installationVueConfigFilename,
} from './projects';
import { type InstallationSelection, type PlayerOwner, selectionToInput } from './selection';
import {
  registrySkinSelection,
  shadcnAddCommand,
  shadcnInitCommand,
  optionalShadcnInitCommand,
  shadcnProjectConfiguration,
  shadcnProjectConfigurationPlacement,
  shadcnRegistryAddCommand,
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
  condition?: 'when-components-json-missing';
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
  const methods = owner === 'react' ? (['packaged', 'shadcn'] as const) : (['packaged', 'shadcn', 'cdn'] as const);
  const packageManager = defaults.packageManager ?? 'pnpm';
  const options = installationOptionDefinitions(owner).map((option) =>
    option.flag === '--package-manager' ? { ...option, default: packageManager } : option
  );
  const packagedInput: InstallationInput = {
    method: 'packaged',
    framework: owner === 'react' ? 'react' : 'html',
    project: 'existing',
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
    project: 'new',
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
    decisionOrder: installationDecisionOrderFor({ methods, frameworks }),
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
                project: 'new',
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

function prepareAppStep(selection: InstallationSelection): InstallationStep | null {
  if (selection.project === 'existing') return null;

  const command = installationProjectCreateCommand(selection.framework, selection.template, selection.packageManager);
  if (!command) throw new Error('A new project needs an app setup command.');

  return {
    id: 'prepare-app',
    title: 'Create the app',
    description:
      selection.method === 'cdn'
        ? 'Scaffold a minimal Vite site in the intended empty app directory, then continue from that directory.'
        : selection.template === 'laravel'
          ? 'Make sure PHP, Composer, and the Laravel installer are available. Run this from the parent directory, change videojs-app to your preferred directory name when needed, and continue from the new app.'
          : `Scaffold a ${INSTALLATION_TEMPLATE_LABELS[selection.template]} app in the intended empty app directory, then continue from that directory.`,
    blocks: [code('bash', command)],
  };
}

function runAppStep(selection: InstallationSelection): InstallationStep | null {
  const command = installationProjectRunCommand(selection.template, selection.packageManager);
  if (!command) return null;

  return {
    id: 'run',
    title: 'Run your app',
    description: 'Start the development server and verify that the selected media plays.',
    blocks: [code('bash', command)],
  };
}

function playerFileDescription(selection: InstallationSelection): string {
  if (selection.template === 'none') {
    return 'The filenames are generic. Add the imports and markup to the files your existing HTML app or page already loads.';
  }

  return selection.project === 'new'
    ? 'Add these files to the new app, replacing the starter page where shown.'
    : `Merge the example into the existing ${INSTALLATION_TEMPLATE_LABELS[selection.template]} route or component that should render the player, and preserve unrelated content.`;
}

function createPackagedSteps(selection: InstallationSelection, packageVersion: string): InstallationStep[] {
  const opts = installationOptions(selection);
  const project = installationProjectFiles(selection.framework, selection.template, selection.useCase);
  const steps: InstallationStep[] = [];
  const prepareApp = prepareAppStep(selection);

  if (prepareApp) steps.push(prepareApp);

  if (selection.framework === 'react') {
    const install = generateReactInstallCode(opts, packageVersion);
    const player = generateReactCreateCode(opts);

    steps.push(packageInstallStep(install[selection.packageManager]), {
      id: 'player',
      title: 'Add your player',
      description: playerFileDescription(selection),
      blocks: [code('tsx', installationReactPlayerCode(player['app/page.tsx'], selection.template), project.player)],
    });

    if (project.usage) {
      steps.at(-1)!.blocks = [
        ...steps.at(-1)!.blocks,
        code('astro', installationReactUsageCode(selection.template)!, project.usage),
      ];
    }

    const runApp = runAppStep(selection);

    if (runApp) steps.push(runApp);

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
        title: 'Register custom elements',
        description: 'Use the file that matches your Vue toolchain.',
        blocks: [
          code(
            selection.template === 'astro' ? 'js' : 'ts',
            config[installationVueConfigFilename(selection.template)],
            project.config
          ),
        ],
      },
      {
        id: 'player',
        title: 'Add your player',
        description: playerFileDescription(selection),
        blocks: [
          code('vue', component.component, project.player),
          code(
            selection.template === 'astro' ? 'astro' : 'vue',
            selection.template === 'astro' ? usage['index.astro'] : usage['App.vue'],
            project.usage
          ),
        ],
      }
    );
    const runApp = runAppStep(selection);

    if (runApp) steps.push(runApp);

    return steps;
  }

  if (selection.framework === 'svelte') {
    const component = generateSvelteCreateCode(opts);
    const usage = generateSvelteUsageCode({ ...opts, playerImport: project.playerImport });

    steps.push(packageInstallStep(install[selection.packageManager]), {
      id: 'player',
      title: 'Add your player',
      description: playerFileDescription(selection),
      blocks: [
        code('svelte', component.component, project.player),
        code(
          selection.template === 'astro' ? 'astro' : 'svelte',
          selection.template === 'astro'
            ? usage['index.astro']
            : selection.template === 'sveltekit'
              ? usage['+page.svelte']
              : usage['App.svelte'],
          project.usage
        ),
      ],
    });
    const runApp = runAppStep(selection);

    if (runApp) steps.push(runApp);

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
    description: playerFileDescription(selection),
    blocks,
  });
  const runApp = runAppStep(selection);

  if (runApp) steps.push(runApp);

  return steps;
}

function createCdnSteps(selection: InstallationSelection): InstallationStep[] {
  const opts = installationOptions(selection);
  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS, selection.cdnBase);
  const usage = generateHTMLUsageCode(opts);

  const steps: InstallationStep[] = [];
  const prepareApp = prepareAppStep(selection);

  if (prepareApp) steps.push(prepareApp);

  steps.push(
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
    }
  );

  const runApp = runAppStep(selection);

  if (runApp) steps.push(runApp);

  return steps;
}

function createShadcnSteps(selection: InstallationSelection, packageVersion: string): InstallationStep[] {
  const opts = installationOptions(selection);
  const registry = registrySkinSelection({ useCase: selection.useCase, skin: selection.skin });
  if (!registry || !selection.styling) throw new Error('Invalid Shadcn selection');

  const project = installationProjectFiles(selection.framework, selection.template, selection.useCase);
  const configuration = shadcnProjectConfiguration(
    selection.framework,
    selection.template,
    selection.styling,
    project.componentsAlias
  );
  const steps: InstallationStep[] = [];
  const configurationPlacement = shadcnProjectConfigurationPlacement(configuration, selection.project);
  const inlineOptionalInit = configurationPlacement === 'registry';

  if (configuration.mode === 'shadcn-init') {
    if (configurationPlacement === 'app') {
      steps.push({
        id: 'prepare-app',
        title: 'Create and configure the app',
        description: `Run this from the parent directory, change videojs-app to your preferred directory name when needed, and continue from the new app. Shadcn creates the ${INSTALLATION_TEMPLATE_LABELS[selection.template]} app and components.json together.`,
        blocks: [code('bash', shadcnInitCommand(selection.packageManager, selection.template))],
      });
    }

    if (configurationPlacement === 'section') {
      steps.push({
        id: 'configure-source-registry',
        title: 'Configure Shadcn',
        condition: 'when-components-json-missing',
        description:
          'Merge any missing alias configuration below first, keep the app’s existing plugins and compiler options, then initialize Shadcn non-interactively. This path assumes the app already uses Tailwind CSS; otherwise, rerun agents init with --styling css.',
        blocks: [
          ...configuration.aliasSetup.map((block) => code(block.language, block.code, block.filename)),
          code('bash', optionalShadcnInitCommand(selection.packageManager)),
        ],
      });
    }
  } else {
    const prepareApp = prepareAppStep(selection);

    if (prepareApp) steps.push(prepareApp);

    steps.push({
      id: 'configure-source-registry',
      title: 'Configure Shadcn',
      condition: 'when-components-json-missing',
      description: `Skip this step when components.json already uses the standard https://ui.shadcn.com/schema.json schema; preserve that file and its aliases. Otherwise, merge every app-alias block below, then create the standard config in the app directory. When converting a framework-specific Shadcn config, keep its alias values but use the standard schema. The generated components alias maps registry files to ${project.componentsDirectory}.`,
      blocks: [
        ...configuration.aliasSetup.map((block) => code(block.language, block.code, block.filename)),
        code('json', configuration.componentsConfig!, 'components.json', 'create'),
      ],
    });
  }

  if (inlineOptionalInit) {
    steps.push({
      id: 'create-components-json',
      title: 'Create components.json (optional)',
      condition: 'when-components-json-missing',
      blocks: [code('bash', optionalShadcnInitCommand(selection.packageManager))],
    });
  }

  steps.push({
    id: 'videojs-registry',
    title: 'Add the Video.js Registry',
    description:
      'This adds the selected @videojs catalog when the namespace is missing. If components.json already defines @videojs with another URL, replace that value with the URL from this command first because Shadcn skips configured namespaces.',
    blocks: [
      code(
        'bash',
        shadcnRegistryAddCommand(selection.packageManager, selection.sourceFramework, selection.styling, registry.theme)
      ),
    ],
  });

  steps.push({
    id: 'skin-source',
    title: 'Add the skin source',
    description: [
      selection.project === 'existing'
        ? 'Commit current source first so every added or replaced file is reviewable.'
        : null,
      'The add command overwrites an existing Video.js skin so catalog and theme changes fully apply. Review and remove obsolete Video.js style files left by a previous catalog.',
      selection.sourceFramework === 'html'
        ? 'The later media step restores the selected media element after an overwrite.'
        : null,
    ]
      .filter((sentence) => sentence !== null)
      .join(' '),
    blocks: [code('bash', shadcnAddCommand(selection.packageManager, [registry.item]))],
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
    const player = generateSourceReactCreateCode({
      ...opts,
      componentsAlias: project.componentsAlias,
      styling: selection.styling ?? undefined,
    });

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Use the aliases.components value from components.json in the skin import when it differs from the generated ${project.componentsAlias} path. ${playerFileDescription(selection)}`,
      blocks: [code('tsx', installationReactPlayerCode(player['app/page.tsx'], selection.template), project.player)],
    });

    if (project.usage) {
      steps.at(-1)!.blocks = [
        ...steps.at(-1)!.blocks,
        code('astro', installationReactUsageCode(selection.template)!, project.usage),
      ];
    }

    const runApp = runAppStep(selection);

    if (runApp) steps.push(runApp);

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
      description: `Move the complete contents of ${player.sourceSkinFile} into ${player.skinFile} inside a <template> block, then replace the <!-- Add a compatible media element here. --> placeholder with the slot below. For video skins, remove the inline style attribute from the root media-container and add the generated <style> block outside <template>. Merge the matching isCustomElement option into your existing Vue config, keeping its other plugins and aliases. The reusable player wraps that skin, while the app supplies the media and its src.`,
      blocks: [
        code(
          selection.template === 'astro' ? 'js' : 'ts',
          player[installationVueConfigFilename(selection.template)],
          project.config
        ),
        code('html', '<slot />', player.skinFile, 'replace', '<!-- Add a compatible media element here. -->'),
        ...(player.skinStyle ? [code('vue', player.skinStyle, player.skinFile)] : []),
        code('vue', player.component, project.player),
        code(
          selection.template === 'astro' ? 'astro' : 'vue',
          selection.template === 'astro' ? player['index.astro'] : player['App.vue'],
          project.usage
        ),
      ],
    });
    const runApp = runAppStep(selection);

    if (runApp) steps.push(runApp);

    return steps;
  }

  if (selection.framework === 'svelte') {
    const player = generateSourceSvelteUsageCode({
      ...opts,
      componentsAlias: project.componentsImportAlias ?? project.componentsAlias,
      componentsDirectory: project.componentsDirectory,
      playerImport: project.playerImport,
    });

    steps.push({
      id: 'player',
      title: 'Add your player',
      description: `Move the complete contents of ${player.sourceSkinFile} into ${player.skinFile}, then replace the <!-- Add a compatible media element here. --> placeholder with the slot below. For video skins, remove the inline style attribute from the root media-container and add the generated <style> block. The reusable player wraps that skin, while the selected ${INSTALLATION_TEMPLATE_LABELS[selection.template]} app supplies the media and its src.`,
      blocks: [
        code('html', '<slot />', player.skinFile, 'replace', '<!-- Add a compatible media element here. -->'),
        ...(player.skinStyle ? [code('svelte', player.skinStyle, player.skinFile)] : []),
        code('svelte', player.component, project.player),
        code(
          selection.template === 'astro' ? 'astro' : 'svelte',
          selection.template === 'astro'
            ? player['index.astro']
            : selection.template === 'sveltekit'
              ? player['+page.svelte']
              : player['App.svelte'],
          project.usage
        ),
      ],
    });
    const runApp = runAppStep(selection);

    if (runApp) steps.push(runApp);

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
    description: `Replace the <!-- Add a compatible media element here. --> placeholder in ${player.skinFile} with the media snippet below. Then paste the complete updated skin markup into the player where indicated. ${playerFileDescription(selection)}`,
    blocks: [
      code('html', player.media, player.skinFile, 'replace', '<!-- Add a compatible media element here. -->'),
      code('ts', player.imports, project.usage),
      code('html', installationHtmlPageCode(player.player, selection.template, project.usage!), project.player),
    ],
  });
  const runApp = runAppStep(selection);

  if (runApp) steps.push(runApp);

  return steps;
}

export function createInstallationPlan(selection: InstallationSelection, packageVersion: string): InstallationPlan {
  const resolvedSourceUrl = resolveInstallationSourceUrl(selection.sourceUrl, selection.media, selection.useCase);
  const explicit = selectionToInput({ ...selection, sourceUrl: resolvedSourceUrl });
  const relevantInput: InstallationInput = {
    method: explicit.method,
    framework: explicit.framework,
    project: explicit.project,
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
