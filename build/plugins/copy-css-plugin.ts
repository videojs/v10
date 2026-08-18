import { existsSync, globSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveImports } from './resolve-css-imports.ts';
import type { BuildPlugin } from './types.ts';

interface CopyCssPluginOptions {
  skinsDir: string;
  outDir: string;
  inline?: boolean;
  rebuild?: boolean;
}

export function copyCssPlugin(options: CopyCssPluginOptions): BuildPlugin {
  const { skinsDir, outDir, inline = true, rebuild = true } = options;
  let poll: ReturnType<typeof setInterval> | undefined;
  let state = new Map<string, string>();

  function getCssFiles() {
    return new Set([...globSync('src/**/*.css'), ...globSync(join(skinsDir, '**/*.css'))]);
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
      const content = readFileSync(file, 'utf-8');
      const output = inline ? resolveImports(content, dirname(file), skinsDir) : content;
      const outFile = join(outDir, file.replace(/^src\//, ''));
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
