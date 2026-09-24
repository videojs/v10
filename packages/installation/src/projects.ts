import type { PackageManager } from './parameters';

export const INSTALLATION_FRAMEWORKS = ['react', 'html', 'vue', 'svelte'] as const;
export type InstallationFramework = (typeof INSTALLATION_FRAMEWORKS)[number];

export const INSTALLATION_TEMPLATES = [
  'none',
  'next',
  'vite',
  'start',
  'react-router',
  'astro',
  'laravel',
  'nuxt',
  'sveltekit',
] as const;
export type InstallationTemplate = (typeof INSTALLATION_TEMPLATES)[number];

export const INSTALLATION_TEMPLATE_LABELS = {
  none: 'Existing site',
  next: 'Next.js',
  vite: 'Vite',
  start: 'TanStack Start',
  'react-router': 'React Router',
  astro: 'Astro',
  laravel: 'Laravel',
  nuxt: 'Nuxt',
  sveltekit: 'SvelteKit',
} as const satisfies Record<InstallationTemplate, string>;

const TEMPLATES_BY_FRAMEWORK = {
  react: ['next', 'vite', 'start', 'react-router', 'astro', 'laravel'],
  html: ['none', 'vite', 'astro', 'laravel'],
  vue: ['vite', 'nuxt'],
  svelte: ['vite', 'sveltekit'],
} as const satisfies Record<InstallationFramework, readonly InstallationTemplate[]>;

export interface InstallationProjectFiles {
  componentsAlias: string;
  componentsImportAlias?: string;
  componentsDirectory: string;
  player: string;
  playerImport?: string;
  usage?: string;
  config?: string;
}

export interface InstallationProjectSetupBlock {
  code: string;
  filename: string;
  language: 'js' | 'json' | 'ts';
}

function includes<const Values extends readonly string[]>(values: Values, value: string): value is Values[number] {
  return values.includes(value);
}

export function installationTemplates(framework: InstallationFramework): readonly InstallationTemplate[] {
  return TEMPLATES_BY_FRAMEWORK[framework];
}

export function isInstallationTemplate(value: string | null | undefined): value is InstallationTemplate {
  return value != null && includes(INSTALLATION_TEMPLATES, value);
}

export function defaultInstallationTemplate(framework: InstallationFramework): InstallationTemplate {
  return framework === 'react' ? 'next' : 'vite';
}

export function resolveInstallationTemplate(
  framework: InstallationFramework,
  template: InstallationTemplate | null
): InstallationTemplate {
  const templates = installationTemplates(framework);

  return template && includes(templates, template) ? template : defaultInstallationTemplate(framework);
}

export function installationProjectFiles(
  framework: InstallationFramework,
  template: InstallationTemplate
): InstallationProjectFiles {
  if (framework === 'react') {
    if (template === 'next') {
      return {
        componentsAlias: '@/components',
        componentsDirectory: 'components',
        player: 'app/page.tsx',
      };
    }

    if (template === 'start') {
      return {
        componentsAlias: '@/components',
        componentsDirectory: 'src/components',
        player: 'src/routes/index.tsx',
      };
    }

    if (template === 'react-router') {
      return {
        componentsAlias: '~/components',
        componentsDirectory: 'app/components',
        player: 'app/routes/home.tsx',
      };
    }

    if (template === 'astro') {
      return {
        componentsAlias: '@/components',
        componentsDirectory: 'src/components',
        player: 'src/components/VideoPlayer.tsx',
        usage: 'src/pages/index.astro',
      };
    }

    if (template === 'laravel') {
      return {
        componentsAlias: '@/components',
        componentsDirectory: 'resources/js/components',
        player: 'resources/js/pages/welcome.tsx',
      };
    }

    return {
      componentsAlias: '@/components',
      componentsDirectory: 'src/components',
      player: 'src/App.tsx',
    };
  }

  if (framework === 'vue') {
    if (template === 'nuxt') {
      return {
        componentsAlias: '@/components',
        componentsDirectory: 'app/components',
        player: 'app/components/MediaPlayer.client.vue',
        playerImport: '#components',
        usage: 'app/app.vue',
        config: 'nuxt.config.ts',
      };
    }

    return {
      componentsAlias: '@/components',
      componentsDirectory: 'src/components',
      player: 'src/components/MediaPlayer.vue',
      playerImport: './components/MediaPlayer.vue',
      usage: 'src/App.vue',
      config: 'vite.config.ts',
    };
  }

  if (framework === 'svelte') {
    return template === 'sveltekit'
      ? {
          componentsAlias: '#lib/components',
          componentsImportAlias: '$lib/components',
          componentsDirectory: 'src/lib/components',
          player: 'src/lib/VideoPlayer.svelte',
          usage: 'src/routes/+page.svelte',
        }
      : {
          componentsAlias: '$lib/components',
          componentsDirectory: 'src/lib/components',
          player: 'src/lib/VideoPlayer.svelte',
          usage: 'src/App.svelte',
        };
  }

  if (template === 'none') {
    return {
      componentsAlias: '@/components',
      componentsDirectory: 'components',
      player: 'index.html',
      usage: 'player.ts',
    };
  }

  if (template === 'astro') {
    return {
      componentsAlias: '@/components',
      componentsDirectory: 'src/components',
      player: 'src/pages/index.astro',
      usage: 'src/scripts/player.ts',
    };
  }

  if (template === 'laravel') {
    return {
      componentsAlias: '@/components',
      componentsDirectory: 'resources/js/components',
      player: 'resources/views/welcome.blade.php',
      usage: 'resources/js/player.ts',
    };
  }

  return {
    componentsAlias: '@/components',
    componentsDirectory: 'src/components',
    player: 'index.html',
    usage: 'src/player.ts',
  };
}

/** Alias configuration needed before a hand-authored Shadcn config can resolve a fresh app's component paths. */
export function installationProjectAliasSetup(
  framework: InstallationFramework,
  template: InstallationTemplate
): readonly InstallationProjectSetupBlock[] {
  if (template === 'sveltekit') {
    return [
      {
        code: JSON.stringify({ imports: { '#lib/*': './src/lib/*' } }, null, 2),
        filename: 'package.json',
        language: 'json',
      },
    ];
  }

  if (!['vite', 'astro', 'laravel', 'nuxt'].includes(template)) return [];

  const alias = framework === 'svelte' ? '$lib' : '@';
  const sourceRoot =
    template === 'laravel'
      ? './resources/js'
      : template === 'nuxt'
        ? './app'
        : framework === 'svelte'
          ? './src/lib'
          : './src';
  const sourceDirectory = `${sourceRoot}/*`;
  const tsconfigCode = JSON.stringify(
    {
      compilerOptions: {
        paths: { [`${alias}/*`]: [sourceDirectory] },
      },
    },
    null,
    2
  );
  const tsconfigs =
    template === 'vite' && framework !== 'html' ? ['tsconfig.json', 'tsconfig.app.json'] : ['tsconfig.json'];
  const blocks: InstallationProjectSetupBlock[] = tsconfigs.map((filename) => ({
    code: tsconfigCode,
    filename,
    language: 'json',
  }));

  if (template === 'laravel') {
    blocks.push({
      code: `import path from 'node:path';

export default defineConfig({
  // Keep the existing Laravel plugin and options.
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './resources/js'),
    },
  },
});`,
      filename: 'vite.config.js',
      language: 'js',
    });
  }

  if (template !== 'vite') return blocks;

  const pluginImport =
    framework === 'react'
      ? "import react from '@vitejs/plugin-react';"
      : framework === 'vue'
        ? "import vue from '@vitejs/plugin-vue';"
        : framework === 'svelte'
          ? "import { svelte } from '@sveltejs/vite-plugin-svelte';"
          : '';
  const plugin =
    framework === 'react' ? 'react()' : framework === 'vue' ? 'vue()' : framework === 'svelte' ? 'svelte()' : '';
  const plugins = plugin ? `  plugins: [${plugin}],\n` : '';
  const aliasDirectory = sourceRoot;

  blocks.push({
    code: `${pluginImport ? `${pluginImport}\n` : ''}import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
${plugins}  resolve: {
    alias: {
      '${alias}': path.resolve(import.meta.dirname, '${aliasDirectory}'),
    },
  },
});`,
    filename: 'vite.config.ts',
    language: 'ts',
  });

  return blocks;
}

/** Build configuration needed to expose a generated HTML entry module. */
export function installationHtmlEntrySetup(
  template: InstallationTemplate,
  entryFile: string
): readonly InstallationProjectSetupBlock[] {
  if (template !== 'laravel') return [];

  return [
    {
      code: `laravel({
  input: [
    // Keep the existing entries.
    '${entryFile}',
  ],
  refresh: true,
})`,
      filename: 'vite.config.js',
      language: 'js',
    },
  ];
}

function packageRunner(packageManager: PackageManager, executable: string): string {
  if (packageManager === 'pnpm') return `pnpm dlx ${executable}`;

  if (packageManager === 'yarn') return `npx ${executable}`;

  if (packageManager === 'bun') return `bunx --bun ${executable}`;

  return `npx ${executable}`;
}

function viteCreateCommand(framework: InstallationFramework, packageManager: PackageManager): string {
  const template = framework === 'html' ? 'vanilla-ts' : `${framework}-ts`;
  const install = `${packageManager} install`;

  if (packageManager === 'npm') {
    return `npm create vite@latest . -- --template ${template} --no-interactive\n${install}`;
  }

  if (packageManager === 'pnpm') return `pnpm create vite . --template ${template} --no-interactive\n${install}`;

  if (packageManager === 'yarn') return `yarn create vite . --template ${template} --no-interactive\n${install}`;

  return `bun create vite . --template ${template} --no-interactive\n${install}`;
}

/** A current official app scaffold for an empty directory. Existing apps skip this command. */
export function installationProjectCreateCommand(
  framework: InstallationFramework,
  template: InstallationTemplate,
  packageManager: PackageManager
): string | null {
  if (template === 'none') return null;

  if (template === 'vite') return viteCreateCommand(framework, packageManager);

  if (template === 'next') {
    const usePackageManager = `--use-${packageManager}`;
    const options = `--ts --eslint --app --no-src-dir --import-alias "@/*" ${usePackageManager} --yes`;

    if (packageManager === 'pnpm') return `pnpm create next-app . ${options}`;

    if (packageManager === 'yarn') return `yarn create next-app . ${options}`;

    if (packageManager === 'bun') return `bun create next-app . ${options}`;

    return `npx create-next-app@latest . ${options}`;
  }

  if (template === 'start') {
    return `${packageRunner(packageManager, '@tanstack/cli')} create . --framework React --package-manager ${packageManager} --blank -y`;
  }

  if (template === 'react-router') {
    return `${packageRunner(packageManager, 'create-react-router@latest')} . --package-manager ${packageManager} --yes --no-git-init`;
  }

  if (template === 'astro') {
    const addReact = framework === 'react' ? ' --add react' : '';

    if (packageManager === 'npm') return `npm create astro@latest . -- --template minimal${addReact} --yes --no-git`;

    if (packageManager === 'pnpm') return `pnpm create astro@latest . --template minimal${addReact} --yes --no-git`;

    if (packageManager === 'yarn') return `yarn create astro . --template minimal${addReact} --yes --no-git`;

    return `bun create astro . --template minimal${addReact} --yes --no-git`;
  }

  if (template === 'laravel') {
    const starter = framework === 'react' ? ' --react' : '';
    const usePackageManager = packageManager === 'npm' ? '' : ` --${packageManager}`;

    return `laravel new <app-directory>${starter}${usePackageManager} --no-interaction\ncd <app-directory>`;
  }

  if (template === 'nuxt') {
    const options = `--template minimal --packageManager ${packageManager} --no-gitInit --no-modules --force`;

    if (packageManager === 'npm') return `npm create nuxt@latest . -- ${options}`;

    if (packageManager === 'pnpm') return `pnpm create nuxt@latest . ${options}`;

    if (packageManager === 'yarn') return `yarn create nuxt . ${options}`;

    return `bun create nuxt@latest . ${options}`;
  }

  return `${packageRunner(packageManager, 'sv')} create --template minimal --types ts --no-add-ons --install ${packageManager} .`;
}

/** Extra framework integration needed only when adapting an existing app. */
export function installationProjectFrameworkSetupCommand(
  framework: 'react',
  template: 'astro',
  packageManager: PackageManager
): string;
export function installationProjectFrameworkSetupCommand(
  framework: InstallationFramework,
  template: InstallationTemplate,
  packageManager: PackageManager
): string | null;
export function installationProjectFrameworkSetupCommand(
  framework: InstallationFramework,
  template: InstallationTemplate,
  packageManager: PackageManager
): string | null {
  if (framework !== 'react' || template !== 'astro') return null;

  if (packageManager === 'pnpm') return 'pnpm exec astro add react --yes';

  if (packageManager === 'yarn') return 'yarn astro add react --yes';

  if (packageManager === 'bun') return 'bunx astro add react --yes';

  return 'npx astro add react --yes';
}

export function installationProjectRunCommand(
  template: InstallationTemplate,
  packageManager: PackageManager
): string | null {
  if (template === 'none') return null;

  if (template === 'laravel') return 'composer run dev';

  if (packageManager === 'npm') return 'npm run dev';

  if (packageManager === 'pnpm') return 'pnpm dev';

  if (packageManager === 'yarn') return 'yarn dev';

  return 'bun run dev';
}

/** Connect an HTML page to the generated local entry module for its app setup. */
export function installationHtmlPageCode(markup: string, template: InstallationTemplate, entryFile: string): string {
  if (template === 'laravel') return `${markup}\n\n@vite('${entryFile}')`;

  if (template === 'astro') {
    const source = `../${entryFile.replace(/^src\//, '')}`;

    return `${markup}\n\n<script src="${source}"></script>`;
  }

  return `${markup}\n\n<script type="module" src="/${entryFile}"></script>`;
}

export function installationVueConfigFilename(template: InstallationTemplate): 'nuxt.config.ts' | 'vite.config.ts' {
  return template === 'nuxt' ? 'nuxt.config.ts' : 'vite.config.ts';
}

export function installationReactPlayerCode(code: string, template: InstallationTemplate): string {
  if (template === 'next') return code;

  if (template === 'vite') return code.replace('function Page()', 'function App()');

  if (template === 'start') {
    return `import { createFileRoute } from '@tanstack/react-router';
${code.replace('export default function Page()', 'function Page()')}

export const Route = createFileRoute('/')({ component: Page });`;
  }

  if (template === 'astro') return code.replace('function Page()', 'function Player()');

  return code;
}

export function installationReactUsageCode(template: InstallationTemplate): string | null {
  if (template !== 'astro') return null;

  return `---
import VideoPlayer from '../components/VideoPlayer';
---

<VideoPlayer client:load />`;
}
