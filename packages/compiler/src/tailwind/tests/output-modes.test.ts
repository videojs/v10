import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compile as compileSource } from '../../compile';
import { clearTokenModuleCache } from '../../styles';
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
    '[--media-popover-side-offset:0.5rem]',
    'pointer-fine:transition-[scale,filter,opacity]',
    'motion-reduce:[--media-controls-transition-duration:50ms]',
    'contrast-more:[--media-surface-background-color:oklch(0_0_0)]',
    '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)]',
    '@2xl/media-root:flex-nowrap'
  ),
  button: cn(
    'group',
    'relative flex items-center',
    'disabled:opacity-50',
    'data-[availability=unsupported]:hidden',
    'aria-expanded:bg-current/10',
    'focus-visible:outline-current',
    'before:absolute',
    "before:content-['x']",
    'after:absolute'
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
    <FixtureRoot className="container p-4 [--media-controls-transition-duration:100ms] [color:var(--media-color-primary,oklch(1_0_0))] [&_video]:block [&:fullscreen]:[--media-border-radius:0]">
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

const compact = (value: string): string => value.replace(/\s+/g, '');

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
          return (<FixtureRoot className="container p-4 [--media-controls-transition-duration:100ms] [color:var(--media-color-primary,oklch(1_0_0))] [&_video]:block [&:fullscreen]:[--media-border-radius:0]">
            <Controls className="flex flex-wrap [--media-popover-side-offset:0.5rem] pointer-fine:transition-[scale,filter,opacity] motion-reduce:[--media-controls-transition-duration:50ms] contrast-more:[--media-surface-background-color:oklch(0_0_0)] [@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)] @2xl/media-root:flex-nowrap">
              <Button className="group relative flex items-center disabled:opacity-50 data-[availability=unsupported]:hidden aria-expanded:bg-current/10 focus-visible:outline-current before:absolute before:content-['x'] after:absolute">
                <Icon className="hidden opacity-0 group-data-paused:block group-data-paused:opacity-100 group-not-data-paused:opacity-0"/>
              </Button>
              <div className="absolute [left:var(--media-slider-pointer)] has-[[role=img]:not([data-hidden])]:opacity-100"/>
            </Controls>
          </FixtureRoot>);
      }
      "
    `);
  });

  it('inlines static token segments while preserving runtime class expressions', async () => {
    const result = await compileSource(
      `import { styles } from './tokens';

export function Fixture({ className }: { className?: string }) {
  return <Controls className={[styles.controls, className]} />;
}
`,
      {
        filename: sourcePath,
        configDir: workDir,
        config: { plugins: [tailwind({ mode: 'inline' })] },
      }
    );

    expect(result.assets).toEqual([]);
    expect(result.code).not.toContain('styles.');
    expect(compact(result.code)).toContain(
      compact(
        '<Controls className={["flex flex-wrap [--media-popover-side-offset:0.5rem] pointer-fine:transition-[scale,filter,opacity] motion-reduce:[--media-controls-transition-duration:50ms] contrast-more:[--media-surface-background-color:oklch(0_0_0)] [@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)] @2xl/media-root:flex-nowrap", className]} />'
      )
    );
  });

  it('inlines conditional token branches without retaining the token module', async () => {
    const result = await compileSource(
      `import { styles } from './tokens';

export function Fixture({ active }: { active: boolean }) {
  return <Button className={active ? styles.button : styles.icon} />;
}
`,
      {
        filename: sourcePath,
        configDir: workDir,
        config: { plugins: [tailwind({ mode: 'inline' })] },
      }
    );

    expect(result.code).not.toContain("'./tokens'");
    expect(result.code).toContain(
      `className={active ? "group relative flex items-center disabled:opacity-50 data-[availability=unsupported]:hidden aria-expanded:bg-current/10 focus-visible:outline-current before:absolute before:content-['x'] after:absolute" : "hidden opacity-0 group-data-paused:block group-data-paused:opacity-100 group-not-data-paused:opacity-0"}`
    );
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
            emit: { themeSelector: '.media-test-skin' },
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
              <Button className="button">
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
    expect(css).toContain('--tw-content');
    expect(css).toContain('var(--tw-content)');
    expect(css).toMatchInlineSnapshot(`
      ".media-test-skin {
        --default-transition-duration: 150ms;
        --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        --spacing: 0.25rem;
      }

      /*! tailwindcss v4.2.1 | MIT License | https://tailwindcss.com */
      @layer properties;

      .button {
        align-items: center;
        display: flex;
        position: relative;
      }

      .button:before {
        content: var(--tw-content);
        --tw-content: "x";
        content: var(--tw-content);
        position: absolute;
      }

      .button:after {
        content: var(--tw-content);
        position: absolute;
      }

      .button:focus-visible {
        outline-color: currentColor;
      }

      .button:disabled {
        opacity: .5;
      }

      .button[aria-expanded="true"] {
        background-color: currentColor;
      }

      @supports (color: color-mix(in lab, red, red)) {
        .button[aria-expanded="true"] {
          background-color: color-mix(in oklab, currentcolor 10.0%, transparent);
        }
      }

      .button[data-availability="unsupported"] {
        display: none;
      }

      .controls {
        --media-popover-side-offset: .5rem;
        flex-wrap: wrap;
        display: flex;
      }

      @media (prefers-reduced-motion: reduce) {
        .controls {
          --media-controls-transition-duration: 50ms;
        }
      }

      @media (prefers-contrast: more) {
        .controls {
          --media-surface-background-color: oklch(0% 0 0);
        }
      }

      @container media-root (width >= 42rem) {
        .controls {
          flex-wrap: nowrap;
        }
      }

      @media (pointer: fine) {
        .controls {
          transition-property: scale, filter, opacity;
          transition-timing-function: var(--tw-ease, var(--default-transition-timing-function, cubic-bezier(.4, 0, .2, 1)));
          transition-duration: var(--tw-duration, var(--default-transition-duration, .15s));
        }
      }

      @media (prefers-reduced-transparency: reduce) {
        .controls {
          --media-surface-background-color: oklch(0% 0 0);
        }
      }

      .fixture-root {
        width: 100%;
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
      }

      .fixture-root {
        padding: calc(var(--spacing, .25rem) * 4);
        color: var(--media-color-primary, oklch(100% 0 0));
        --media-controls-transition-duration: .1s;
      }

      .fixture-root video {
        display: block;
      }

      .fixture-root:fullscreen {
        --media-border-radius: 0;
      }

      .icon {
        opacity: 0;
        display: none;
      }

      .icon:is(:where(.button):not([data-paused]) *) {
        opacity: 0;
      }

      .icon:is(:where(.button)[data-paused] *) {
        opacity: 1;
        display: block;
      }

      .thumbnail {
        left: var(--media-slider-pointer);
        position: absolute;
      }

      .thumbnail:has([role="img"]:not([data-hidden])) {
        opacity: 1;
      }

      @property --tw-content {
        syntax: "*";
        inherits: false;
        initial-value: "";
      }

      @layer properties {
        @supports (((-webkit-hyphens: none)) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color: rgb(from red r g b)))) {
          *, :before, :after, ::backdrop {
            --tw-content: "";
          }
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
