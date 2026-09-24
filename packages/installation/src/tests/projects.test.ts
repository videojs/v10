import { describe, expect, it } from 'vitest';

import {
  installationHtmlPageCode,
  installationHtmlEntrySetup,
  installationProjectCreateCommand,
  installationProjectFiles,
  installationProjectAliasSetup,
  installationProjectRunCommand,
  installationReactPlayerCode,
} from '../projects';

describe('installationProjectFiles', () => {
  it('maps app setups to files the framework actually renders', () => {
    expect(installationProjectFiles('react', 'next').player).toBe('app/page.tsx');
    expect(installationProjectFiles('react', 'vite').player).toBe('src/App.tsx');
    expect(installationProjectFiles('react', 'start').player).toBe('src/routes/index.tsx');
    expect(installationProjectFiles('vue', 'nuxt')).toMatchObject({
      config: 'nuxt.config.ts',
      player: 'app/components/MediaPlayer.client.vue',
      playerImport: '#components',
      usage: 'app/app.vue',
    });
    expect(installationProjectFiles('svelte', 'sveltekit')).toMatchObject({
      componentsAlias: '#lib/components',
      componentsImportAlias: '$lib/components',
      player: 'src/lib/VideoPlayer.svelte',
      usage: 'src/routes/+page.svelte',
    });
    expect(installationProjectFiles('html', 'none')).toMatchObject({
      player: 'index.html',
      usage: 'player.ts',
    });
  });
});

describe('installationProjectCreateCommand', () => {
  it('uses the selected package manager and official app scaffold', () => {
    expect(installationProjectCreateCommand('react', 'vite', 'pnpm')).toBe(
      'pnpm create vite . --template react-ts --no-interactive\npnpm install'
    );
    expect(installationProjectCreateCommand('vue', 'nuxt', 'npm')).toBe(
      'npm create nuxt@latest . -- --template minimal --packageManager npm --no-gitInit --no-modules --force'
    );
    expect(installationProjectCreateCommand('svelte', 'sveltekit', 'pnpm')).toBe(
      'pnpm dlx sv create --template minimal --types ts --no-add-ons --install pnpm .'
    );
    expect(installationProjectCreateCommand('react', 'next', 'pnpm')).toContain('--no-src-dir --import-alias "@/*"');
    expect(installationProjectCreateCommand('react', 'laravel', 'pnpm')).toBe(
      'laravel new <app-directory> --react --pnpm --no-interaction\ncd <app-directory>'
    );
    expect(installationProjectRunCommand('vite', 'pnpm')).toBe('pnpm dev');
    expect(installationProjectRunCommand('laravel', 'pnpm')).toBe('composer run dev');
    expect(installationProjectCreateCommand('html', 'none', 'pnpm')).toBeNull();
    expect(installationProjectRunCommand('none', 'pnpm')).toBeNull();
  });
});

describe('installationProjectAliasSetup', () => {
  it('configures aliases for app scaffolds that do not provide them', () => {
    expect(installationProjectAliasSetup('vue', 'vite')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ filename: 'tsconfig.json', code: expect.stringContaining('"@/*"') }),
        expect.objectContaining({ filename: 'tsconfig.app.json', code: expect.stringContaining('"@/*"') }),
        expect.objectContaining({ filename: 'vite.config.ts', code: expect.stringContaining("'@': path.resolve") }),
      ])
    );
    expect(installationProjectAliasSetup('svelte', 'vite')[0]?.code).toContain('"$lib/*"');
    expect(installationProjectAliasSetup('html', 'laravel')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ filename: 'tsconfig.json', code: expect.stringContaining('./resources/js/*') }),
        expect.objectContaining({ filename: 'vite.config.js', code: expect.stringContaining("'@': path.resolve") }),
      ])
    );
    expect(installationProjectAliasSetup('vue', 'nuxt')).toEqual([
      expect.objectContaining({ filename: 'tsconfig.json', code: expect.stringContaining('./app/*') }),
    ]);
    expect(installationProjectAliasSetup('vue', 'vite').every(({ code }) => !code.includes('baseUrl'))).toBe(true);
    expect(installationProjectAliasSetup('react', 'next')).toEqual([]);
  });
});

describe('installationHtmlEntrySetup', () => {
  it('adds the generated Laravel entry to the existing Vite inputs', () => {
    expect(installationHtmlEntrySetup('laravel', 'resources/js/player.ts')).toEqual([
      expect.objectContaining({
        filename: 'vite.config.js',
        language: 'js',
        code: expect.stringContaining("'resources/js/player.ts'"),
      }),
    ]);
    expect(installationHtmlEntrySetup('vite', 'src/player.ts')).toEqual([]);
  });
});

describe('installationHtmlPageCode', () => {
  it('connects the generated entry using each app setup convention', () => {
    expect(installationHtmlPageCode('<video-player />', 'vite', 'src/player.ts')).toContain(
      '<script type="module" src="/src/player.ts"></script>'
    );
    expect(installationHtmlPageCode('<video-player />', 'astro', 'src/scripts/player.ts')).toContain(
      '<script src="../scripts/player.ts"></script>'
    );
    expect(installationHtmlPageCode('<video-player />', 'laravel', 'resources/js/player.ts')).toContain(
      "@vite('resources/js/player.ts')"
    );
  });
});

describe('installationReactPlayerCode', () => {
  it('wraps a TanStack Start page in a file route', () => {
    const result = installationReactPlayerCode('export default function Page() {\n  return <p>Player</p>;\n}', 'start');

    expect(result).toContain("import { createFileRoute } from '@tanstack/react-router';");
    expect(result).toContain("export const Route = createFileRoute('/')({ component: Page });");
    expect(result).not.toContain('export default function Page');
  });
});
