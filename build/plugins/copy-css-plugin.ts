import { existsSync, globSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { transform } from 'lightningcss';

import { resolveImports } from './resolve-css-imports.ts';
import type { BuildPlugin } from './types.ts';

interface CopyCssPluginOptions {
  outDir: string;
  inline?: boolean;
  rebuild?: boolean;
  /**
   * Map a source path to an output path relative to `outDir`, or null to skip the file. Defaults to mirroring the `src`
   * tree.
   */
  rename?: (file: string) => string | null;
  /** Drop an `@import`ed file, by resolved absolute path, instead of inlining it. */
  omitImport?: (file: string) => boolean;
  minify?: boolean;
}

function mirrorSrcTree(file: string): string {
  return file.replace(/^src\//, '');
}

export function copyCssPlugin(options: CopyCssPluginOptions): BuildPlugin {
  const { outDir, inline = true, rebuild = true, rename = mirrorSrcTree, omitImport, minify = false } = options;
  let poll: ReturnType<typeof setInterval> | undefined;
  let state = new Map<string, string>();

  function getCssFiles() {
    return new Set(globSync('src/**/*.css'));
  }

  function getState() {
    return new Map(
      [...getCssFiles()].map((file) => {
        const { mtimeMs, size } = statSync(file);

        return [file, `${mtimeMs}:${size}`];
      })
    );
  }

  function writeCss() {
    for (const file of globSync('src/**/*.css')) {
      const target = rename(file);
      if (target === null) continue;

      const content = readFileSync(file, 'utf-8');
      let output = inline ? resolveImports(content, dirname(file), omitImport) : content;

      if (minify) {
        output = transform({ filename: file, code: Buffer.from(output), minify: true }).code.toString();
      }

      const outFile = join(outDir, target);
      if (existsSync(outFile) && readFileSync(outFile, 'utf-8') === output) continue;

      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, output);
    }
  }

  function checkCss() {
    try {
      const next = getState();
      if (next.size === state.size && [...next].every(([file, value]) => state.get(file) === value)) return;

      writeCss();
      state = next;
    } catch (error) {
      console.error(error);
    }
  }

  return {
    name: 'copy-css',
    buildStart() {
      if (!rebuild && process.argv.includes('--watch')) {
        if (!poll) {
          state = getState();
          poll = setInterval(checkCss, 100);
        }

        return;
      }

      for (const file of getCssFiles()) {
        this.addWatchFile(file);
      }
    },
    writeBundle: writeCss,
    closeWatcher() {
      clearInterval(poll);
    },
  };
}
