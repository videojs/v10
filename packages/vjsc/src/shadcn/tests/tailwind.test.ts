import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { readTailwindRegistryTheme } from '../tailwind';

async function write(source: string): Promise<{ root: string; path: string }> {
  const root = await mkdtemp(join(tmpdir(), 'vjsc-tailwind-'));
  const path = './tailwind.css';

  await writeFile(join(root, path), source);

  return { root, path };
}

describe('readTailwindRegistryTheme', () => {
  it('collects theme variables, utilities, and custom variants', async () => {
    const { root, path } = await write(`
      @theme inline {
        --color-accent: var(--accent);
        --radius-control: 0.5rem;
      }

      /* Comments and strings are inert while scanning { braces }. */
      @utility font-control {
        font-family: var(--font, "Inter { Variable }", sans-serif);
      }

      @utility surface-control {
        box-shadow:
          0 0 0 1px var(--border),
          var(--shadow);
        backdrop-filter: blur(16px)
      }

      @utility clip-control-* {
        clip-path: inset(0 calc(100% - var(--value([*]))) 0 0 round var(--radius));
      }

      @custom-variant opaque {
        @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
          @slot;
        }
      }

      @custom-variant coarse (@media (pointer: coarse));
    `);

    await expect(readTailwindRegistryTheme(root, path)).resolves.toEqual({
      cssVars: { 'color-accent': 'var(--accent)', 'radius-control': '.5rem' },
      css: {
        '@utility font-control': { 'font-family': 'var(--font, "Inter { Variable }", sans-serif)' },
        '@utility surface-control': {
          'box-shadow': '0 0 0 1px var(--border), var(--shadow)',
          'backdrop-filter': 'blur(16px)',
        },
        '@utility clip-control-*': {
          'clip-path': 'inset(0 calc(100% - var(--value([*]))) 0 0 round var(--radius))',
        },
        '@custom-variant opaque': {
          '@media (prefers-reduced-transparency: reduce), (prefers-contrast: more)': { '@slot': {} },
        },
        '@custom-variant coarse (@media (pointer: coarse))': {},
      },
    });
  });

  it('rejects utilities that are not flat declaration lists', async () => {
    const { root, path } = await write(`
      @utility nested-control {
        color: red;
        &:hover { color: blue; }
      }
    `);

    await expect(readTailwindRegistryTheme(root, path)).rejects.toThrow('flat declaration list');
  });

  it('rejects unnamed and conflicting definitions', async () => {
    const unnamed = await write('@utility { color: red; }');
    const conflicting = await write('@utility a-control { color: red; } @utility a-control { color: blue; }');

    await expect(readTailwindRegistryTheme(unnamed.root, unnamed.path)).rejects.toThrow('unnamed');
    await expect(readTailwindRegistryTheme(conflicting.root, conflicting.path)).rejects.toThrow('more than once');
  });
});
