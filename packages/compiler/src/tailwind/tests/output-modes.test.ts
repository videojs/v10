import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compile as compileSource } from '../../compile';
import { clearTokenModuleCache } from '../evaluator';
import { tailwind } from '../plugin';

const MINIMAL_CSS = `
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.7 0.2 250);
}
`;

const TOKENS = `
import { cn } from '@videojs/utils/style';

export const styles = {
  controls: cn(
    'flex flex-wrap',
    'pointer-fine:transition-[scale,filter,opacity]',
    'motion-reduce:[--media-controls-transition-duration:50ms]',
    'contrast-more:[--media-surface-background-color:oklch(0_0_0)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)]',
    '@2xl/media-root:flex-nowrap'
  ),
  button: cn(
    'group',
    'flex items-center',
    'disabled:opacity-50',
    'data-[availability=unsupported]:hidden',
    'aria-expanded:bg-current/10',
    'focus-visible:outline-current'
  ),
  icon: cn(
    'hidden opacity-0',
    'group-data-paused:block',
    'group-data-paused:opacity-100',
    'group-not-data-paused:opacity-0'
  ),
  thumbnail: cn(
    'absolute',
    '[left:var(--media-slider-pointer)]',
    'has-[[role=img]:not([data-hidden])]:opacity-100'
  ),
};
`;

const SOURCE = `
import { styles } from './tokens';

export function Fixture() {
  return (
    <FixtureRoot className="container p-4 [--media-popover-side-offset:0.5rem] [--media-controls-transition-duration:100ms] [color:var(--media-color-primary,oklch(1_0_0))] [&_video]:block [&:fullscreen]:[--media-border-radius:0]">
      <Controls className={styles.controls}>
        <Button className={styles.button}>
          <Icon className={styles.icon} />
        </Button>
        <div className={styles.thumbnail} />
      </Controls>
    </FixtureRoot>
  );
}
`;

let workDir: string;
let sourcePath: string;
let cssPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-output-modes-'));
  sourcePath = writeFixture('skin.tsx', SOURCE);
  cssPath = writeFixture('tailwind.css', MINIMAL_CSS);
  writeFixture('tokens.ts', TOKENS);
});

afterEach(() => {
  clearTokenModuleCache();
});

describe('tailwind output modes', () => {
  it('inlines static token-backed utilities without emitting CSS assets', async () => {
    const result = await compileSource(SOURCE, {
      filename: sourcePath,
      configDir: workDir,
      config: { plugins: [tailwind({ mode: 'inline' })] },
    });

    expect(result.assets).toEqual([]);
    expect(result.code).not.toContain('styles.');
    expect(result.code).toMatchInlineSnapshot(`
      "export function Fixture() {
          return (<FixtureRoot className="container p-4 [--media-popover-side-offset:0.5rem] [--media-controls-transition-duration:100ms] [color:var(--media-color-primary,oklch(1_0_0))] [&_video]:block [&:fullscreen]:[--media-border-radius:0]">
            <Controls className="flex flex-wrap pointer-fine:transition-[scale,filter,opacity] motion-reduce:[--media-controls-transition-duration:50ms] contrast-more:[--media-surface-background-color:oklch(0_0_0)] [@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)] @2xl/media-root:flex-nowrap">
              <Button className="group flex items-center disabled:opacity-50 data-[availability=unsupported]:hidden aria-expanded:bg-current/10 focus-visible:outline-current">
                <Icon className="hidden opacity-0 group-data-paused:block group-data-paused:opacity-100 group-not-data-paused:opacity-0"/>
              </Button>
              <div className="absolute [left:var(--media-slider-pointer)] has-[[role=img]:not([data-hidden])]:opacity-100"/>
            </Controls>
          </FixtureRoot>);
      }
      "
    `);
  });

  it('extracts static utilities to scoped vanilla CSS assets', async () => {
    const result = await compileSource(SOURCE, {
      filename: sourcePath,
      configDir: workDir,
      config: {
        plugins: [
          tailwind({
            mode: 'extract',
            input: cssPath,
            vars: { hoist: { rootSelector: '.media-test-skin' } },
          }),
        ],
      },
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({ type: 'css', fileName: 'skin.css' });
    expect(result.code).toMatchInlineSnapshot(`
      "export function Fixture() {
          return (<FixtureRoot className="fixture-root">
            <Controls className="controls">
              <Button className="button group">
                <Icon className="icon"/>
              </Button>
              <div className="thumbnail"/>
            </Controls>
          </FixtureRoot>);
      }
      "
    `);

    const css = result.assets[0]!.source;
    expect(css).not.toMatch(/\.media-test-skin\s*{[^}]*--media-border-radius/);
    expect(css).toMatchInlineSnapshot(`
      ".media-test-skin {
        --default-transition-duration: 150ms;
        --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        --spacing: 0.25rem;
      }

      .media-test-skin {
        --media-popover-side-offset: 0.5rem;
      }

      .button {
        align-items: center;
        display: flex;
      }

      .button:disabled {
        opacity: 50%;
      }

      .button:focus-visible {
        outline-color: currentcolor;
      }

      .button[aria-expanded="true"] {
        background-color: color-mix(in oklab, currentcolor 10%, transparent);
      }

      .button[data-availability="unsupported"] {
        display: none;
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
      }

      .fixture-root {
        --media-controls-transition-duration: 100ms;
        color: var(--media-color-primary,oklch(1 0 0));
        padding: calc(var(--spacing) * 4);
        width: 100%;
      }

      .fixture-root video {
        display: block;
      }

      .fixture-root:fullscreen {
        --media-border-radius: 0;
      }

      .icon {
        display: none;
        opacity: 0%;
      }

      .icon:is(:where(.group):not(*[data-paused]) *) {
        opacity: 0%;
      }

      .icon:is(:where(.group)[data-paused] *) {
        display: block;
        opacity: 100%;
      }

      .thumbnail {
        left: var(--media-slider-pointer);
        position: absolute;
      }

      .thumbnail:has(*:is([role=img]:not([data-hidden]))) {
        opacity: 100%;
      }

      @container media-root (width >= 42rem) {
        .controls {
          flex-wrap: nowrap;
        }
      }

      @media (pointer: fine) {
        .controls {
          transition-duration: var(--tw-duration, var(--default-transition-duration));
          transition-property: scale,filter,opacity;
          transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
        }
      }

      @media (prefers-contrast: more) {
        .controls {
          --media-surface-background-color: oklch(0 0 0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .controls {
          --media-controls-transition-duration: 50ms;
        }
      }

      @media (prefers-reduced-transparency:reduce) {
        .controls {
          --media-surface-background-color: oklch(0 0 0);
        }
      }

      @media (width >= 40rem) {
        .fixture-root {
          max-width: 40rem;
        }
      }

      @media (width >= 48rem) {
        .fixture-root {
          max-width: 48rem;
        }
      }

      @media (width >= 64rem) {
        .fixture-root {
          max-width: 64rem;
        }
      }

      @media (width >= 80rem) {
        .fixture-root {
          max-width: 80rem;
        }
      }

      @media (width >= 96rem) {
        .fixture-root {
          max-width: 96rem;
        }
      }"
    `);
  });
});

function writeFixture(relative: string, content: string): string {
  const absolute = join(workDir, relative);
  writeFileSync(absolute, content, 'utf8');
  return absolute;
}
