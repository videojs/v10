import cdnMedia from '@/content/cdn-media.json';
import {
  generateHTMLInstallCode,
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  generateSourceHTMLUsageCode,
  generateSourceMediaInstallCode,
  generateSourceReactCreateCode,
  generateSvelteCreateCode,
  generateSvelteUsageCode,
  generateVueCreateCode,
  generateVueCustomElementConfigCode,
  generateVueUsageCode,
  type InstallationOptions,
} from '@/utils/installation/codegen';
import {
  type RegistryFramework,
  registryInstallCommands,
  registrySkinSelection,
  type RegistryStyling,
  type RegistryTemplate,
  type ShadcnRunner,
  shadcnInitCommand,
} from '@/utils/installation/shadcn';

const CDN_MEDIA_SUBPATHS = cdnMedia.map((entry) => entry.id);

export function formatInstallationCode(opts: InstallationOptions): string {
  if (opts.framework === 'html') {
    return formatHTMLInstallation(opts);
  }

  return formatReactInstallation(opts);
}

export function formatCdnInstallation(opts: InstallationOptions): string {
  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS);
  const usage = generateHTMLUsageCode({ ...opts, installMethod: 'cdn' });

  return [
    '## Load Video.js\n',
    `\`\`\`html\n${install.cdn}\n\`\`\``,
    '\n## Add your player\n',
    `\`\`\`html\n${usage.html}\n\`\`\``,
  ].join('\n');
}

export function formatVueInstallation(opts: InstallationOptions): string {
  if (opts.installMethod === 'cdn') throw new Error('Vue installation needs a package manager');

  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS);
  const config = generateVueCustomElementConfigCode(opts);
  const create = generateVueCreateCode(opts);
  const usage = generateVueUsageCode(opts);

  return [
    '## Install the packages\n',
    `\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``,
    '\n## Register the custom elements\n',
    '### Vite: `vite.config.ts`\n',
    `\`\`\`ts\n${config['vite.config.ts']}\n\`\`\``,
    '\n### Nuxt: `nuxt.config.ts`\n',
    `\`\`\`ts\n${config['nuxt.config.ts']}\n\`\`\``,
    '\n## Add your player\n',
    '### `components/VideoPlayer.vue`\n',
    `\`\`\`html\n${create['VideoPlayer.vue']}\n\`\`\``,
    '\n### `App.vue`\n',
    `\`\`\`html\n${usage['App.vue']}\n\`\`\``,
  ].join('\n');
}

export function formatSvelteInstallation(opts: InstallationOptions): string {
  if (opts.installMethod === 'cdn') throw new Error('Svelte installation needs a package manager');

  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS);
  const create = generateSvelteCreateCode(opts);
  const usage = generateSvelteUsageCode(opts);

  return [
    '## Install the packages\n',
    `\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``,
    '\n## Add your player\n',
    '### `src/lib/VideoPlayer.svelte`\n',
    `\`\`\`html\n${create['VideoPlayer.svelte']}\n\`\`\``,
    '\n### SvelteKit: `src/routes/+page.svelte`\n',
    `\`\`\`html\n${usage['+page.svelte']}\n\`\`\``,
    '\n### Svelte: `src/App.svelte`\n',
    `\`\`\`html\n${usage['App.svelte']}\n\`\`\``,
  ].join('\n');
}

interface ShadcnFormatOptions {
  framework: RegistryFramework;
  runner: ShadcnRunner;
  styling: RegistryStyling;
  template: RegistryTemplate;
}

export function formatShadcnInstallation(opts: InstallationOptions, setup: ShadcnFormatOptions): string {
  const selection = registrySkinSelection({ useCase: opts.useCase, skin: opts.skin });
  if (!selection) throw new Error('The selected preset and skin are not available from the Shadcn registry');

  const init = shadcnInitCommand(setup.runner, setup.template);
  const add = registryInstallCommands(setup.runner, setup.framework, setup.styling, [selection.item], selection.theme);
  const adapter = generateSourceMediaInstallCode(opts.renderer);
  const sections = [
    '## Initialize Shadcn\n',
    'Run this from the app directory that contains `components.json`, or where you want the CLI to create it.\n',
    'Commit your work first so you can review every file the CLI adds or replaces.\n',
    `\`\`\`bash\n${init}\n\`\`\``,
    '\nIf the app already has `components.json`, skip this command.\n',
    '\n## Add the skin source\n',
    `\`\`\`bash\n${add}\n\`\`\``,
  ];

  if (adapter) {
    sections.push(
      '\n## Install the media adapter\n',
      'This media source needs a separate playback adapter.\n',
      `\`\`\`bash\n${adapter[setup.runner]}\n\`\`\``
    );
  }

  sections.push('\n## Add your player\n');

  if (setup.framework === 'react') {
    const create = generateSourceReactCreateCode(opts);

    sections.push('Add this to `app/page.tsx`.\n', `\`\`\`tsx\n${create['app/page.tsx']}\n\`\`\``);
  } else {
    const create = generateSourceHTMLUsageCode(opts);

    sections.push(
      `### 1. Add the media element to \`${create.skinFile}\`\n`,
      `\`\`\`html\n${create.media}\n\`\`\``,
      '\n### 2. Register the custom elements in `src/player.ts`\n',
      `\`\`\`ts\n${create.imports}\n\`\`\``,
      '\n### 3. Add the player to `index.html`\n',
      `\`\`\`html\n${create.player}\n\`\`\``
    );
  }

  return sections.join('\n');
}

function formatHTMLInstallation(opts: InstallationOptions): string {
  const install = generateHTMLInstallCode(opts, CDN_MEDIA_SUBPATHS);
  const usage = generateHTMLUsageCode(opts);
  const sections: string[] = [];

  sections.push('## Install Video.js\n');

  if (opts.installMethod === 'cdn') {
    sections.push(`\`\`\`html\n${install.cdn}\n\`\`\``);
  } else {
    sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);
  }

  if (usage.imports) {
    sections.push('\n## TypeScript imports\n');
    sections.push(`\`\`\`ts\n${usage.imports}\n\`\`\``);
  }

  sections.push('\n## HTML\n');
  sections.push(`\`\`\`html\n${usage.html}\n\`\`\``);

  return sections.join('\n');
}

function formatReactInstallation(opts: InstallationOptions): string {
  const install = generateReactInstallCode(opts);
  const create = generateReactCreateCode(opts);

  const sections: string[] = [];

  if (opts.installMethod === 'cdn') {
    throw new Error('CDN install method is not supported for React');
  }

  sections.push('## Install Video.js\n');
  sections.push(`\`\`\`bash\n${install[opts.installMethod]}\n\`\`\``);

  sections.push('\n## Add your player\n');
  sections.push('Add to `app/page.tsx`:\n');
  sections.push(`\`\`\`tsx\n${create['app/page.tsx']}\n\`\`\``);

  return sections.join('\n');
}
