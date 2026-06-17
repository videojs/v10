import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import type { DesignSystem } from '../design-system';
import { loadDesignSystem } from '../design-system';
import type { CompiledRule } from '../emit';
import { clearTokenModuleCache } from '../evaluator';
import { tailwindPlugin } from '../plugin';

const MINIMAL_CSS = `
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.7 0.2 250);
}
`;

let design: DesignSystem;

beforeAll(async () => {
  const cssDir = mkdtempSync(join(tmpdir(), 'compiler-tw-plugin-'));
  const cssPath = join(cssDir, 'tailwind.css');
  writeFileSync(cssPath, MINIMAL_CSS, 'utf8');
  design = await loadDesignSystem(cssPath);
}, 30_000);

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-tw-fixture-'));
});

afterEach(() => {
  clearTokenModuleCache();
});

const writeFixture = (relative: string, content: string): string => {
  const abs = join(workDir, relative);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return abs;
};

const collapse = (s: string): string => s.replace(/\s+/g, '');

describe('tailwindPlugin — target: tailwind (passthrough)', () => {
  it('leaves className values unchanged', () => {
    const source = `function App(){ return <Foo className="flex items-center"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'tailwind' })],
    });
    expect(code).toContain('"flex items-center"');
  });

  it('does not call onRules / onCss', () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    let called = 0;
    compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'tailwind',
          onRules: () => {
            called++;
          },
        }),
      ],
    });
    expect(called).toBe(0);
  });
});

describe('tailwindPlugin — target: tailwind-inlined', () => {
  it('flattens a literal-string className to itself', () => {
    const source = `function App(){ return <Foo className="flex items-center"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'tailwind-inlined' })],
    });
    expect(code).toContain('"flex items-center"');
  });

  it('flattens a `cn(...)` call into a single literal string', () => {
    const source = `function App(){ return <Foo className={cn('flex', 'items-center', 'gap-2')}/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'tailwind-inlined' })],
    });
    expect(code).toContain('"flex items-center gap-2"');
    expect(code).not.toMatch(/cn\(/);
  });

  it('resolves token references via the on-disk evaluator', () => {
    writeFixture(
      'tokens.ts',
      `import { cn } from '@videojs/utils/style';
export const tokens = { button: { base: cn('rounded', 'p-2') } };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App(){ return <Foo className={cn('flex', styles.button.base)}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = compile(source, {
      target: 'react',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, target: 'tailwind-inlined', sourcePath })],
    });
    expect(code).toContain('"flex rounded p-2"');
  });

  it('leaves the className alone if a token cannot be resolved', () => {
    const source = `import { tokens as styles } from './missing';
function App(){ return <Foo className={cn('flex', styles.unknown)}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);
    const { code } = compile(source, {
      target: 'react',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, target: 'tailwind-inlined', sourcePath })],
    });
    expect(code).toMatch(/cn\(/);
  });

  it('leaves opaque expressions intact', () => {
    const source = `function App(){ return <Foo className={cn('flex', isOn && 'on')}/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'tailwind-inlined' })],
    });
    expect(code).toMatch(/cn\(/);
  });
});

describe('tailwindPlugin — target: vanilla-css', () => {
  it('rewrites className to a tag-derived semantic name', () => {
    const source = `function App(){ return <PlayButton className="flex items-center"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
    });
    expect(code).toContain('"play-button"');
    expect(code).not.toContain('"flex items-center"');
  });

  it('preserves marker utilities (group/peer) alongside the derived name', () => {
    const source = `function App(){ return <PlayButton className="group"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
    });
    // `group` produces no declarations but is required by descendant
    // `group-*` variants, so it must survive on the element.
    expect(code).toContain('"play-button group"');
  });

  it('keeps markers and still emits rules for declaration-producing utilities', () => {
    const source = `function App(){ return <PlayButton className={cn('flex', 'group')}/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(code).toContain('"play-button group"');
    expect(captured).toBeDefined();
    expect(captured!.map((r) => r.className)).toContain('play-button');
    expect(captured!.flatMap((r) => r.utility.declarations)).toContainEqual({ property: 'display', value: 'flex' });
  });

  it('preserves a marker while wrapping pass-through expressions in cn()', () => {
    const source = `function App(){ return <PlayButton className={cn('group', extra)}/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
    });
    expect(code).toMatch(/cn\("play-button group",\s*extra\)/);
  });

  it('throws a diagnostic when two elements derive the same name with different styles', () => {
    const source = `function App(){ return <div><SeekIcon className="flex"/><SeekIcon className="block"/></div>; }`;
    expect(() =>
      compile(source, {
        target: 'react',
        plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
      })
    ).toThrow(/class name 'seek-icon' is derived from elements with different styles/);
  });

  it('does not flag identical recurrences of the same derived name', () => {
    const source = `function App(){ return <div><PlayButton className="flex"/><PlayButton className="flex"/></div>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
    });
    expect(code).toContain('"play-button"');
  });

  it('rewrites className to a token-path-derived name on a bare HTML element', () => {
    const source = `function App(){ return <div className={styles.bufferingIndicator}/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
    });
    expect(code).toContain('"buffering-indicator"');
  });

  it('honours overrides keyed by tag', () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          overrides: { PlayButton: 'custom' },
        }),
      ],
    });
    expect(code).toContain('"custom"');
  });

  it('runs the transformName hook', () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          transformName: (ctx) => `app-${ctx.defaultName}`,
        }),
      ],
    });
    expect(code).toContain('"app-play-button"');
  });

  it('collects CompiledRule[] via onRules', () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured).toBeDefined();
    expect(captured!.length).toBeGreaterThan(0);
    expect(captured![0]!.className).toBe('foo');
    expect(captured![0]!.utility.declarations).toContainEqual({ property: 'display', value: 'flex' });
  });

  it('expands a `cn(...)` call into one rule per utility', () => {
    const source = `function App(){ return <Foo className={cn('flex', 'opacity-50')}/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured!.length).toBe(2);
    expect(captured![0]!.className).toBe('foo');
    expect(captured![1]!.className).toBe('foo');
  });

  it('resolves token references via the on-disk evaluator', () => {
    writeFixture(
      'tokens.ts',
      `import { cn } from '@videojs/utils/style';
export const tokens = { button: cn('flex', 'gap-2') };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App(){ return <Foo className={styles.button}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    let captured: readonly CompiledRule[] | undefined;
    compile(source, {
      target: 'react',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          sourcePath,
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured!.length).toBe(2);
    expect(captured![0]!.className).toBe('foo');
  });

  it('annotates rules with a bag via bagFor', () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          bagFor: ({ className }) => (className.startsWith('play-') ? 'controls' : undefined),
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured![0]!.bag).toBe('controls');
  });

  it('skips opaque expressions', () => {
    const source = `function App(){ return <Foo className={isOn ? 'a' : 'b'}/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured).toBeUndefined();
    expect(code).toContain('isOn');
  });

  it('resolves a local cn() const referenced via className={X}', () => {
    writeFixture(
      'tokens.ts',
      `import { cn } from '@videojs/utils/style';
export const tokens = { button: { base: 'flex', icon: 'w-4 h-4' } };
`
    );
    const source = `import { tokens as styles } from './tokens';
import { cn } from '@videojs/utils/style';
const iconButton = cn(styles.button.base, styles.button.icon);
function App(){ return <PlayButton className={iconButton}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    let captured: readonly CompiledRule[] | undefined;
    const { code } = compile(source, {
      target: 'react',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          sourcePath,
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(code).toContain('"play-button"');
    expect(captured!.length).toBe(3);
    const utilities = captured!.map((r) => r.utility.utility).sort();
    expect(utilities).toEqual(['flex', 'h-4', 'w-4']);
  });

  it('preserves opaque expressions by wrapping the derived name in cn()', () => {
    const source = `function App({ extra }){ return <PlayButton className={cn('flex', extra)}/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [tailwindPlugin({ design, target: 'vanilla-css' })],
    });
    expect(code).toMatch(/cn\("play-button",\s*extra\)/);
  });

  it('handles multiple elements in one source', () => {
    const source = `function App(){
      return <PlayButton className="flex"><PlayIcon className="opacity-50"/></PlayButton>;
    }`;
    let captured: readonly CompiledRule[] | undefined;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        tailwindPlugin({
          design,
          target: 'vanilla-css',
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured!.length).toBe(2);
    const names = captured!.map((r) => r.className);
    expect(names).toContain('play-button');
    expect(names).toContain('play-icon');
    expect(collapse(code)).toContain(collapse(`<PlayButton className="play-button">`));
    expect(collapse(code)).toContain(collapse(`<PlayIcon className="play-icon"/>`));
  });

  it('forwards CSS through onCss when set', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    const cssPromise = new Promise<string>((resolve) => {
      compile(source, {
        target: 'react',
        plugins: [
          tailwindPlugin({
            design,
            target: 'vanilla-css',
            onCss: (out) => {
              if (out.kind === 'merged') resolve(out.css);
            },
          }),
        ],
      });
    });
    const css = await cssPromise;
    expect(collapse(css)).toContain(collapse('.foo{display:flex;}'));
  });

  it('emits referenced theme variables in the onCss output', async () => {
    // `p-4` lowers to `padding: calc(var(--spacing) * 4)` — the output must
    // define `--spacing` so it resolves without a separate Tailwind theme.
    const source = `function App(){ return <Foo className="p-4"/>; }`;
    const cssPromise = new Promise<string>((resolve) => {
      compile(source, {
        target: 'react',
        plugins: [
          tailwindPlugin({
            design,
            target: 'vanilla-css',
            hoistVars: { rootSelector: '[data-skin="x"]' },
            onCss: (out) => {
              if (out.kind === 'merged') resolve(out.css);
            },
          }),
        ],
      });
    });
    const css = await cssPromise;
    expect(css).toMatch(/\[data-skin="x"\]\s*{[^}]*--spacing:/);
  });
});
