import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { compile as compileSource } from '../../compile';
import { type CompilerTransform, jsx } from '../../config';
import type { DesignSystem } from '../design-system';
import { loadDesignSystem } from '../design-system';
import type { CompiledRule } from '../emit';
import { clearTokenModuleCache } from '../evaluator';
import { tailwind, tailwindPlugin } from '../plugin';

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

const compile = (
  source: string,
  options: {
    filename?: string | undefined;
    target?: 'jsx' | undefined;
    plugins?: readonly CompilerTransform[] | undefined;
  } = {}
) => compileSource(source, { filename: options.filename, config: { target: jsx({ transforms: options.plugins }) } });

const compileTailwind = (source: string, options: Parameters<typeof tailwind>[0], filename?: string) =>
  compileSource(source, { filename, config: { styles: tailwind(options) } });

describe('tailwindPlugin — mode: preserve', () => {
  it('preserves static className values', async () => {
    const source = `function App(){ return <Foo className="flex items-center"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'preserve' })],
    });
    expect(code).toContain('"flex items-center"');
  });

  it('skips extracted rule callbacks', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    let called = 0;
    await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'preserve',
          onRules: () => {
            called++;
          },
        }),
      ],
    });
    expect(called).toBe(0);
  });
});

describe('tailwindPlugin — mode: inline', () => {
  it('preserves static className values', async () => {
    const source = `function App(){ return <Foo className="flex items-center"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toContain('"flex items-center"');
  });

  it('folds static cn calls', async () => {
    const source = `function App(){ return <Foo className={cn('flex', 'items-center', 'gap-2')}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toContain('"flex items-center gap-2"');
    expect(code).not.toMatch(/cn\(/);
  });

  it('resolves imported token objects', async () => {
    writeFixture(
      'tokens.ts',
      `import { cn } from '@videojs/utils/style';
export const tokens = { button: { base: cn('rounded', 'p-2') } };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App(){ return <Foo className={cn('flex', styles.button.base)}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'inline', sourcePath })],
    });
    expect(code).toContain('"flex rounded p-2"');
  });

  it('leaves unresolved imports untouched', async () => {
    const source = `import { tokens as styles } from './missing';
function App(){ return <Foo className={cn('flex', styles.unknown)}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);
    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'inline', sourcePath })],
    });
    expect(code).toMatch(/cn\(/);
  });

  it('leaves dynamic cn calls untouched', async () => {
    const source = `function App(){ return <Foo className={cn('flex', isOn && 'on')}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toMatch(/cn\(/);
  });
});

describe('tailwindPlugin — mode: extract', () => {
  it('replaces static utilities with component class names', async () => {
    const source = `function App(){ return <PlayButton className="flex items-center"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"play-button"');
    expect(code).not.toContain('"flex items-center"');
  });

  it('preserves group marker classes', async () => {
    const source = `function App(){ return <PlayButton className="group"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    // `group` produces no declarations but is required by descendant
    // `group-*` variants, so it must survive on the element.
    expect(code).toContain('"play-button group"');
  });

  it('extracts cn utilities and preserves group marker classes', async () => {
    const source = `function App(){ return <PlayButton className={cn('flex', 'group')}/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
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

  it('keeps dynamic cn expressions', async () => {
    const source = `function App(){ return <PlayButton className={cn('group', extra)}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toMatch(/cn\("play-button group",\s*extra\)/);
  });

  it('throws on generated class style collisions', async () => {
    const source = `function App(){ return <div><SeekIcon className="flex"/><SeekIcon className="block"/></div>; }`;
    await expect(
      compile(source, {
        target: 'jsx',
        plugins: [tailwindPlugin({ design, mode: 'extract' })],
      })
    ).rejects.toThrow(/class name 'seek-icon' is derived from elements with different styles/);
  });

  it('allows preserved marker classes next to matching generated styles', async () => {
    const source = `function App(){ return <div><Menu.Item className={cn('flex', 'legacy-submenu')}/><Menu.Item className="flex"/></div>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"menu-item legacy-submenu"');
    expect(code).toContain('"menu-item"');
  });

  it('handles duplicate component styles', async () => {
    const source = `function App(){ return <div><PlayButton className="flex"/><PlayButton className="flex"/></div>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"play-button"');
  });

  it('derives class names from style member expressions', async () => {
    const source = `function App(){ return <div className={styles.bufferingIndicator}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"buffering-indicator"');
  });

  it('preserves named token import roots in class names', async () => {
    writeFixture(
      'tokens.ts',
      `export const slider = { root: 'flex' };
`
    );
    const source = `import { slider } from './tokens';
function App(){ return <div className={slider.root}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      filename: sourcePath,
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract', sourcePath })],
    });
    expect(code).toContain('"slider-root"');
  });

  it('uses known token roots to disambiguate reused component tags', async () => {
    writeFixture(
      'tokens.ts',
      `export const icon = 'inline-block';
export const menu = { chevron: 'size-3' };
export const inputFeedback = { bubble: { shownSeek: 'block' } };
`
    );
    const source = `import { icon, inputFeedback, menu } from './tokens';
function App(){ return <div><ChevronIcon className={cn(icon, menu.chevron)}/><ChevronIcon className={cn(icon, inputFeedback.bubble.shownSeek)}/></div>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      filename: sourcePath,
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract', sourcePath })],
    });
    expect(code).toContain('"menu-chevron"');
    expect(code).toContain('"input-feedback-bubble-shown-seek"');
  });

  it('derives class names from single imported token identifiers', async () => {
    const source = `function App(){ return <div className={buttonGroupStart}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"button-group-start"');
  });

  it('prefers style token names over reusable component tag names', async () => {
    const source = `function App(){ return <Menu.Trigger className={styles.menu.item}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"menu-item"');
  });

  it('derives bare HTML class names from the most specific token path', async () => {
    writeFixture(
      'tokens.ts',
      `export const tokens = { seek: { label: 'text-xs', labelBackward: 'left-0' } };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App(){ return <span className={cn(styles.seek.label, styles.seek.labelBackward)}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract', sourcePath })],
    });

    expect(code).toContain('"seek-label-backward"');
  });

  it('derives bare HTML class names from tokens when runtime segments are present', async () => {
    writeFixture(
      'tokens.ts',
      `export const tokens = { slider: { fill: { base: 'absolute', fill: 'bg-white', buffer: 'bg-white/40' } } };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App({ type, className }){
  return <div className={cn(styles.slider.fill.base, type === 'fill' ? styles.slider.fill.fill : styles.slider.fill.buffer, className)}/>;
}`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract', sourcePath })],
    });

    expect(code).toContain('"slider-fill-base"');
  });

  it('keeps a single simple literal utility as the class name for bare HTML', async () => {
    const source = `function App(){ return <div className="grow"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });

    expect(code).toContain('"grow"');
  });

  it('applies component class overrides', async () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          overrides: { PlayButton: 'custom' },
        }),
      ],
    });
    expect(code).toContain('"custom"');
  });

  it('applies transformed generated class names', async () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          transformName: (ctx) => `app-${ctx.defaultName}`,
        }),
      ],
    });
    expect(code).toContain('"app-play-button"');
  });

  it('reports extracted rules through onRules', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
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

  it('emits one rule per extracted utility', async () => {
    const source = `function App(){ return <Foo className={cn('flex', 'opacity-50')}/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
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

  it('resolves imported tokens before extraction', async () => {
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
    await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          sourcePath,
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured!.length).toBe(2);
    expect(captured![0]!.className).toBe('button');
  });

  it('resolves bare token imports through a configured resolver', async () => {
    const tokenPath = writeFixture(
      'tokens.ts',
      `import { cn } from '@videojs/utils/style';
export const tokens = { button: cn('flex', 'gap-2') };
`
    );
    const source = `import { tokens as styles } from '@fixture/tokens';
function App(){ return <Foo className={styles.button}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    let captured: readonly CompiledRule[] | undefined;
    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          sourcePath,
          resolveTokenModule: (specifier) => (specifier === '@fixture/tokens' ? tokenPath : null),
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });

    expect(code).toContain('"button"');
    expect(captured!.length).toBe(2);
  });

  it('assigns rule bags with bagFor', async () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          bagFor: ({ className }) => (className.startsWith('play-') ? 'controls' : undefined),
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured![0]!.bag).toBe('controls');
  });

  it('skips dynamic conditional class expressions', async () => {
    const source = `function App(){ return <Foo className={isOn ? 'a' : 'b'}/>; }`;
    let captured: readonly CompiledRule[] | undefined;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(captured).toBeUndefined();
    expect(code).toContain('isOn');
  });

  it('resolves local cn constants and imported token members', async () => {
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
    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          sourcePath,
          onRules: (rules) => {
            captured = rules;
          },
        }),
      ],
    });
    expect(code).toContain('"icon-button"');
    expect(captured!.length).toBe(3);
    const utilities = captured!.map((r) => r.utility.utility).sort();
    expect(utilities).toEqual(['flex', 'h-4', 'w-4']);
  });

  it('preserves dynamic cn suffixes after extraction', async () => {
    const source = `function App({ extra }){ return <PlayButton className={cn('flex', extra)}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toMatch(/cn\("play-button",\s*extra\)/);
  });

  it('extracts parent and child element class names', async () => {
    const source = `function App(){
      return <PlayButton className="flex"><PlayIcon className="opacity-50"/></PlayButton>;
    }`;
    let captured: readonly CompiledRule[] | undefined;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
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

  it('returns CSS assets in extract mode', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = assets[0]!.source;
    expect(collapse(css)).toContain(collapse('.foo{display:flex;}'));
  });

  it('emits referenced theme variables in extracted CSS', async () => {
    // `p-4` lowers to `padding: calc(var(--spacing) * 4)` — the output must
    // define `--spacing` so it resolves without a separate Tailwind theme.
    const source = `function App(){ return <Foo className="p-4"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      hoistVars: { rootSelector: '[data-skin="x"]' },
    });
    const css = assets[0]!.source;
    expect(css).toMatch(/\[data-skin="x"\]\s*{[^}]*--spacing:/);
  });

  it('forwards the `properties` option (inline) so --tw-content resolves', async () => {
    // `after:absolute` emits `content: var(--tw-content)` with no setter.
    const source = `function App(){ return <Foo className="after:absolute"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design, properties: { mode: 'inline' } });
    const css = assets[0]!.source;
    expect(css).not.toMatch(/var\(--tw-content\)/);
    expect(collapse(css)).toContain(collapse('content: "";'));
  });
});
