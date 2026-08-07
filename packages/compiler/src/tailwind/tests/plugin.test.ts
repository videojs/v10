import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { compile as compileSource } from '../../compile';
import type { CompilerPlugin } from '../../config';
import { clearTokenModuleCache } from '../../styles';
import type { DesignSystem } from '../design-system';
import { loadDesignSystem } from '../design-system';
import { tailwind } from '../plugin';

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
const tailwindPlugin = tailwind;

const compile = (
  source: string,
  options: {
    filename?: string | undefined;
    target?: 'jsx' | undefined;
    plugins?: readonly CompilerPlugin[] | undefined;
  } = {}
) => compileSource(source, { filename: options.filename, config: { plugins: options.plugins } });

const compileTailwind = (source: string, options: Parameters<typeof tailwind>[0], filename?: string) =>
  compileSource(source, { filename, config: { plugins: [tailwind(options)] } });

describe('tailwindPlugin — mode: preserve', () => {
  it('preserves static className values', async () => {
    const source = `function App(){ return <Foo className="flex items-center"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'preserve' })],
    });
    expect(code).toContain('"flex items-center"');
  });

  it('does not emit CSS assets', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    const { assets } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'preserve' })],
    });
    expect(assets).toEqual([]);
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

  it('folds static className arrays', async () => {
    const source = `function App(){ return <Foo className={['flex', 'items-center', 'gap-2']}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toContain('"flex items-center gap-2"');
    expect(code).not.toMatch(/className=\{\[/);
  });

  it('resolves imported token objects', async () => {
    writeFixture(
      'tokens.ts',
      `export const tokens = { button: { base: ['rounded', 'p-2'] } };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App(){ return <Foo className={['flex', styles.button.base]}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toContain('"flex rounded p-2"');
  });

  it('leaves unresolved imports untouched', async () => {
    const source = `import { tokens as styles } from './missing';
function App(){ return <Foo className={['flex', styles.unknown]}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);
    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toMatch(/className=\{\[/);
  });

  it('leaves dynamic className arrays untouched', async () => {
    const source = `function App(){ return <Foo className={['flex', isOn && 'on']}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'inline' })],
    });
    expect(code).toMatch(/className=\{\[/);
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

  it('removes inferred group marker classes', async () => {
    const source = `function App(){ return <PlayButton className="group"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"play-button"');
  });

  it('extracts className array utilities and removes inferred group marker classes', async () => {
    const source = `function App(){ return <PlayButton className={['flex', 'group']}/>; }`;
    const { assets, code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"play-button"');
    expect(collapse(assets[0]!.source)).toContain(collapse('.play-button{display:flex;}'));
  });

  it('keeps dynamic className array expressions', async () => {
    const source = `function App(){ return <PlayButton className={['group', extra]}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toMatch(/className=\{\["play-button",\s*extra\]\}/);
  });

  it('resolves elements and rewrites inferred marker selectors', async () => {
    const source = `function App(){ return <PlayButton className="group/button"><PlayIcon className="hidden group-data-paused/button:block"/></PlayButton>; }`;
    const { assets, code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            element({ tag }) {
              if (tag === 'PlayButton') return { className: 'media-button', chunk: 'button' };
              if (tag === 'PlayIcon') return { className: 'media-play-icon', chunk: 'button' };
              return undefined;
            },
          },
        }),
      ],
    });

    expect(code).toContain('<PlayButton className="media-button">');
    expect(code).toContain('<PlayIcon className="media-play-icon"/>');
    expect(code).not.toContain('group/button');
    expect(collapse(assets[0]!.source)).toContain(
      collapse('.media-play-icon:is(:where(.media-button)[data-paused] *){display:block;}')
    );
  });

  it('lets resolve.classList customize final static class lists', async () => {
    const source = `function App(){ return <PlayButton className="flex legacy-marker"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            classList({ classes }) {
              return classes.filter((name) => name !== 'legacy-marker');
            },
          },
        }),
      ],
    });

    expect(code).toContain('<PlayButton className="play-button"/>');
  });

  it('uses selector resolution chunks for split CSS assets', async () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { assets } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          emit: { mode: 'split' },
          resolve: {
            element() {
              return { className: 'media-button', chunk: 'button' };
            },
          },
        }),
      ],
    });

    expect(assets.map((asset) => asset.fileName).sort()).toEqual(['button.css', 'input.css']);
    expect(collapse(assets.find((asset) => asset.fileName === 'button.css')!.source)).toContain(
      collapse('.media-button{display:flex;}')
    );
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

  it('allows selector-owned class merges', async () => {
    const source = `function App(){ return <div><PlayButton className="flex"/><SeekButton className="flex relative"/></div>; }`;
    const { assets, code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            element() {
              return 'media-button';
            },
          },
        }),
      ],
    });

    expect(code).toContain('<PlayButton className="media-button"/>');
    expect(code).toContain('<SeekButton className="media-button"/>');
    expect(collapse(assets[0]!.source)).toContain(collapse('.media-button{display:flex;position:relative;}'));
  });

  it('allows preserved marker classes next to matching generated styles', async () => {
    const source = `function App(){ return <div><Menu.Item className={['flex', 'legacy-submenu']}/><Menu.Item className="flex"/></div>; }`;
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
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
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
function App(){ return <div><ChevronIcon className={[icon, menu.chevron]}/><ChevronIcon className={[icon, inputFeedback.bubble.shownSeek]}/></div>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      filename: sourcePath,
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
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
function App(){ return <span className={[styles.seek.label, styles.seek.labelBackward]}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
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
  return <div className={[styles.slider.fill.base, type === 'fill' ? styles.slider.fill.fill : styles.slider.fill.buffer, className]}/>;
}`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
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

  it('applies resolved generated class names', async () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            element: (ctx) => `app-${ctx.defaultName}`,
          },
        }),
      ],
    });
    expect(code).toContain('"app-play-button"');
  });

  it('lets resolve.element choose token names for component elements', async () => {
    const source = `function App(){ return <PlayButton className={styles.button.icon}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            element: (ctx) => ctx.tokenName ?? ctx.defaultName,
          },
        }),
      ],
    });
    expect(code).toContain('"button-icon"');
  });

  it('lets resolve.element choose component names over known token roots', async () => {
    writeFixture(
      'tokens.ts',
      `export const menu = { chevron: 'size-3' };
`
    );
    const source = `import { menu } from './tokens';
function App(){ return <ChevronIcon className={menu.chevron}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            element: (ctx) => ctx.componentName ?? ctx.defaultName,
          },
        }),
      ],
    });
    expect(code).toContain('"chevron-icon"');
  });

  it('renders extracted rules to CSS assets', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    const { assets } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(collapse(assets[0]!.source)).toContain(collapse('.foo{display:flex;}'));
  });

  it('renders declarations from each extracted utility', async () => {
    const source = `function App(){ return <Foo className={['flex', 'opacity-50']}/>; }`;
    const { assets } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    const css = assets[0]!.source;
    expect(collapse(css)).toContain(collapse('.foo{display:flex;opacity:50%;}'));
  });

  it('resolves imported tokens before extraction', async () => {
    writeFixture(
      'tokens.ts',
      `export const tokens = { button: ['flex', 'gap-2'] };
`
    );
    const source = `import { tokens as styles } from './tokens';
function App(){ return <Foo className={styles.button}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { assets, code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"button"');
    expect(collapse(assets[0]!.source)).toContain(collapse('.button{display:flex;gap:calc(var(--spacing) * 2);}'));
  });

  it('resolves imported tokens with explicit extensions before extraction', async () => {
    writeFixture(
      'tokens.ts',
      `export const tokens = { button: 'flex' };
`
    );
    const source = `import { tokens as styles } from './tokens.ts';
function App(){ return <Foo className={styles.button}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"button"');
  });

  it('resolves bare token imports through a configured resolver', async () => {
    const tokenPath = writeFixture(
      'tokens.ts',
      `export const tokens = { button: ['flex', 'gap-2'] };
`
    );
    const source = `import { tokens as styles } from '@fixture/tokens';
function App(){ return <Foo className={styles.button}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { assets, code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: {
            tokenModule: (specifier) => (specifier === '@fixture/tokens' ? tokenPath : null),
          },
        }),
      ],
    });

    expect(code).toContain('"button"');
    expect(collapse(assets[0]!.source)).toContain(collapse('.button{display:flex;gap:calc(var(--spacing) * 2);}'));
  });

  it('assigns split chunks with resolve.element', async () => {
    const source = `function App(){ return <PlayButton className="flex"/>; }`;
    const { assets } = await compile(source, {
      target: 'jsx',
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          emit: { mode: 'split' },
          resolve: {
            element({ defaultName }) {
              return defaultName.startsWith('play-') ? { className: defaultName, chunk: 'controls' } : defaultName;
            },
          },
        }),
      ],
    });
    const controls = assets.find((asset) => asset.fileName.endsWith('controls.css'));
    expect(controls).toBeDefined();
    expect(collapse(controls!.source)).toContain(collapse('.play-button{display:flex;}'));
  });

  it('skips dynamic conditional class expressions', async () => {
    const source = `function App(){ return <Foo className={isOn ? 'a' : 'b'}/>; }`;
    const { assets, code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(assets).toEqual([]);
    expect(code).toContain('isOn');
  });

  it('resolves local className arrays and imported token members', async () => {
    writeFixture(
      'tokens.ts',
      `export const tokens = { button: { base: 'flex', icon: 'w-4 h-4' } };
`
    );
    const source = `import { tokens as styles } from './tokens';
const iconButton = [styles.button.base, styles.button.icon];
function App(){ return <PlayButton className={iconButton}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { assets, code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toContain('"icon-button"');
    const css = assets[0]!.source;
    expect(collapse(css)).toContain(
      collapse('.icon-button{display:flex;height:calc(var(--spacing) * 4);width:calc(var(--spacing) * 4);}')
    );
  });

  it('preserves dynamic className suffixes after extraction', async () => {
    const source = `function App({ extra }){ return <PlayButton className={['flex', extra]}/>; }`;
    const { code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    expect(code).toMatch(/className=\{\["play-button",\s*extra\]\}/);
  });

  it('extracts parent and child element class names', async () => {
    const source = `function App(){
      return <PlayButton className="flex"><PlayIcon className="opacity-50"/></PlayButton>;
    }`;
    const { assets, code } = await compile(source, {
      target: 'jsx',
      plugins: [tailwindPlugin({ design, mode: 'extract' })],
    });
    const css = assets[0]!.source;
    expect(collapse(css)).toContain(collapse('.play-button{display:flex;}'));
    expect(collapse(css)).toContain(collapse('.play-icon{opacity:50%;}'));
    expect(collapse(code)).toContain(collapse(`<PlayButton className="play-button">`));
    expect(collapse(code)).toContain(collapse(`<PlayIcon className="play-icon"/>`));
  });

  it('returns CSS assets in extract mode', async () => {
    const source = `function App(){ return <Foo className="flex"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = assets[0]!.source;
    expect(collapse(css)).toContain(collapse('.foo{display:flex;}'));
  });

  it('preserves multi-branch utilities in extracted CSS assets', async () => {
    const source = `function App(){ return <Foo className="container"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = assets[0]!.source;
    expect(collapse(css)).toContain(collapse('.foo{width:100%;}'));
    expect(css).toMatch(/@media[^{]+{\s*\.foo\s*{\s*max-width:/);
  });

  it('emits referenced theme variables in extracted CSS', async () => {
    // `p-4` lowers to `padding: calc(var(--spacing) * 4)` — the output must
    // define `--spacing` so it resolves without a separate Tailwind theme.
    const source = `function App(){ return <Foo className="p-4"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      vars: { hoist: { rootSelector: '[data-skin="x"]' } },
    });
    const css = assets[0]!.source;
    expect(css).toMatch(/\[data-skin="x"\]\s*{[^}]*--spacing:/);
  });

  it('forwards the `properties` option (inline) so --tw-content resolves', async () => {
    // `after:absolute` emits `content: var(--tw-content)` with no setter.
    const source = `function App(){ return <Foo className="after:absolute"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      vars: { properties: { mode: 'inline' } },
    });
    const css = assets[0]!.source;
    expect(css).not.toMatch(/var\(--tw-content\)/);
    expect(collapse(css)).toContain(collapse('content: "";'));
  });

  it('forwards the `vars.inline` option', async () => {
    const source = `function App(){ return <Foo className="shadow-sm"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      vars: { inline: true },
    });
    const css = assets[0]!.source;
    expect(css).not.toMatch(/--tw-shadow:/);
    expect(css).not.toMatch(/var\(--tw-shadow[),]/);
  });
});
