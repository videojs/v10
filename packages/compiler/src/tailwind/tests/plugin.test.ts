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
import { createStyleClassRegistry, createStyleProgram } from '../program';

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
  it('compiles Tailwind preflight inside the requested skin scope', async () => {
    const css = await design.compilePreflight('.media-skin');

    expect(css).toContain('@scope (.media-skin)');
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('button, input, select');
  });

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
  it('collects multiple source modules into one externally emitted StyleProgram', async () => {
    const program = createStyleProgram({ design, output: 'styles.css', themeSelector: '.media-skin' });
    const first = await compileTailwind(`function Play(){ return <PlayButton className="flex"/>; }`, {
      mode: 'extract',
      program,
    });
    const second = await compileTailwind(`function Menu(){ return <MenuItem className="grid"/>; }`, {
      mode: 'extract',
      program,
    });

    expect(first.assets).toEqual([]);
    expect(second.assets).toEqual([]);
    const emitted = await program.emit();
    expect(emitted.files).toHaveLength(1);
    expect(collapse(emitted.files[0]!.source)).toContain(collapse('.play-button{display:flex;}'));
    expect(collapse(emitted.files[0]!.source)).toContain(collapse('.menu-item{display:grid;}'));
  });

  it('detects semantic class collisions across collected source modules', async () => {
    const program = createStyleProgram({ design, output: 'styles.css' });
    const options = {
      mode: 'extract' as const,
      program,
      resolve: { element: () => 'media-control' },
    };
    await compileTailwind(`function Play(){ return <PlayButton className="flex"/>; }`, options);

    await expect(compileTailwind(`function Menu(){ return <MenuItem className="grid"/>; }`, options)).rejects.toThrow(
      /class name 'media-control' is assigned incompatible utility recipes/
    );
  });

  it('detects semantic class collisions across independently emitted programs', async () => {
    const registry = createStyleClassRegistry();
    await compileTailwind(`function Play(){ return <PlayButton className="flex"/>; }`, {
      mode: 'extract',
      design,
      registry,
      resolve: { element: () => 'media-control' },
    });

    await expect(
      compileTailwind(`function Menu(){ return <MenuItem className="grid"/>; }`, {
        mode: 'extract',
        design,
        registry,
        resolve: { element: () => 'media-control' },
      })
    ).rejects.toThrow(/class name 'media-control' has incompatible recipes across emitted stylesheets/);
  });

  it('lets a caller-owned StyleProgram own all CSS emission options', async () => {
    const program = createStyleProgram({ design, output: 'styles.css' });
    await expect(
      compileTailwind(`function Play(){ return <PlayButton className="flex"/>; }`, {
        mode: 'extract',
        program,
        output: 'other.css',
      })
    ).rejects.toThrow(/caller-owned StyleProgram also owns/);
  });

  it('only emits a StyleProgram once', async () => {
    const program = createStyleProgram({ design, output: 'styles.css' });
    await compileTailwind(`function Play(){ return <PlayButton className="flex"/>; }`, {
      mode: 'extract',
      program,
    });
    await program.emit();

    await expect(program.emit()).rejects.toThrow(/can only be called once/);
  });

  it('rejects Tailwind rules with multiple candidate anchors', async () => {
    const ambiguousDesign: DesignSystem = {
      cssPath: 'fixture.css',
      recognizesCandidate: () => true,
      compileCandidates: async () => '.flex, .grid { display: block; }',
      compilePreflight: async () => '',
      resolveThemeVar: () => undefined,
    };

    await expect(
      compileTailwind(`function App(){ return <Thing className="flex grid"/>; }`, {
        mode: 'extract',
        design: ambiguousDesign,
      })
    ).rejects.toThrow(/multiple utility anchors/);
  });

  it('rejects support CSS interleaved between candidate rules', async () => {
    const interleavedDesign: DesignSystem = {
      cssPath: 'fixture.css',
      recognizesCandidate: () => true,
      compileCandidates: async () =>
        '.flex { display: flex; } @property --fixture { syntax: "*"; inherits: false; } .grid { display: grid; }',
      compilePreflight: async () => '',
      resolveThemeVar: () => undefined,
    };

    await expect(
      compileTailwind(`function App(){ return <Thing className="flex grid"/>; }`, {
        mode: 'extract',
        design: interleavedDesign,
      })
    ).rejects.toThrow(/interleaved support CSS/);
  });

  it('discovers theme variables structurally without matching strings or comments', async () => {
    const requested: string[] = [];
    const variableDesign: DesignSystem = {
      cssPath: 'fixture.css',
      recognizesCandidate: () => true,
      compileCandidates: async () =>
        '.fixture { content: "--not-a-variable"; color: var(--actual-theme-variable); /* --not-a-reference */ }',
      compilePreflight: async () => '',
      resolveThemeVar(name) {
        requested.push(name);
        return name === '--actual-theme-variable' ? 'red' : undefined;
      },
    };

    const { assets } = await compileTailwind(`function App(){ return <Thing className="fixture"/>; }`, {
      mode: 'extract',
      design: variableDesign,
    });

    expect(requested).toEqual(['--actual-theme-variable']);
    expect(assets[0]!.source).toContain('--actual-theme-variable: red');
    expect(assets[0]!.source).not.toMatch(/--not-a-variable\s*:/);
  });

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

  it('rewrites named peer relationships to semantic classes', async () => {
    const source = `function App(){ return <><Toggle className="peer/item"/><Panel className="hidden peer-checked/item:block"/></>; }`;
    const { assets, code } = await compileTailwind(source, { mode: 'extract', design });
    expect(code).toContain('<Toggle className="toggle"/>');
    expect(code).toContain('<Panel className="panel"/>');
    expect(collapse(assets[0]!.source)).toContain(
      collapse('.panel:is(:where(.toggle):checked ~ *) { display: block; }')
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
    ).rejects.toThrow(/class name 'seek-icon' is assigned incompatible utility recipes/);
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
              return { className: 'media-button', merge: true };
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
    expect(collapse(css)).toContain(collapse('.foo{opacity:.5;display:flex;}'));
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
    expect(collapse(assets[0]!.source)).toContain(collapse('.button{gap:calc(var(--spacing,.25rem)*2);display:flex;}'));
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
    expect(collapse(assets[0]!.source)).toContain(collapse('.button{gap:calc(var(--spacing,.25rem)*2);display:flex;}'));
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

  it('extracts reusable token references into separate semantic recipes', async () => {
    writeFixture(
      'tokens.ts',
      `export const button = 'flex p-2';
export const playButton = 'group/play';
`
    );
    const source = `import { button, playButton } from './tokens';
function App(){ return <PlayButton className={[button, playButton]}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { assets, code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          emit: { mode: 'split' },
          resolve: {
            token({ defaultName }) {
              return { className: `media-${defaultName}`, chunk: 'buttons' };
            },
          },
        }),
      ],
    });

    expect(code).toContain('className="media-button media-play-button"');
    const buttons = assets.find((asset) => asset.fileName.endsWith('buttons.css'));
    expect(collapse(buttons!.source)).toContain(
      collapse('.media-button{padding:calc(var(--spacing,.25rem)*2);display:flex;}')
    );
    expect(buttons!.source).not.toContain('.media-play-button{');
  });

  it('extracts token arrays in conditional branches', async () => {
    writeFixture(
      'tokens.ts',
      `export const icon = 'size-4';
export const backward = '-scale-x-100';
export const forward = '';
`
    );
    const source = `import { icon, backward, forward } from './tokens';
function App({ reverse }){ return <Icon className={reverse ? [icon, backward] : [icon, forward]}/>; }`;
    const sourcePath = writeFixture('skin.tsx', source);

    const { code } = await compile(source, {
      target: 'jsx',
      filename: sourcePath,
      plugins: [
        tailwindPlugin({
          design,
          mode: 'extract',
          resolve: { token: ({ defaultName }) => `media-${defaultName}` },
        }),
      ],
    });

    expect(code).toContain('reverse ? "media-icon media-backward" : "media-icon media-forward"');
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
      collapse('.icon-button{height:calc(var(--spacing,.25rem)*4);width:calc(var(--spacing,.25rem)*4);display:flex;}')
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
    expect(collapse(css)).toContain(collapse('.play-icon{opacity:.5;}'));
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
    // `p-4` emits `padding: calc(var(--spacing) * 4)` — the output must
    // define `--spacing` so it resolves without a separate Tailwind theme.
    const source = `function App(){ return <Foo className="p-4"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      emit: { themeSelector: '[data-skin="x"]' },
    });
    const css = assets[0]!.source;
    expect(css).toMatch(/\[data-skin="x"\]\s*{[^}]*--spacing:/);
  });

  it('preserves Tailwind registered-property support', async () => {
    const source = `function App(){ return <Foo className="after:absolute before:content-['x']"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
    });
    const css = assets[0]!.source;
    expect(css).toContain('@property --tw-content');
    expect(css).toContain('var(--tw-content)');
    expect(css).toContain('--tw-content:');
  });

  it('inlines private Tailwind variables for reviewable vanilla CSS', async () => {
    const source = `function App(){ return <Foo className="border-0 outline-2 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      emit: { tailwindVariables: 'inline' },
    });
    const css = assets[0]!.source;
    expect(css).not.toContain('--tw-');
    expect(css).toContain('border-style: solid');
    expect(css).toContain('translate:');
    expect(css).toMatch(/filter:\s+drop-shadow\(/);
  });

  it('rejects cross-rule Tailwind variable state that cannot be safely inlined', async () => {
    const source = `function App(){ return <Foo className="ring-red-500 hover:ring-2"/>; }`;
    await expect(
      compileTailwind(source, {
        mode: 'extract',
        design,
        emit: { tailwindVariables: 'inline' },
      })
    ).rejects.toThrow(/cannot resolve Tailwind variable/);
  });

  it('preserves cross-rule custom-property setters and consumers', async () => {
    const source = `function App(){ return <Foo className="ring-red-500 hover:ring-2"/>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
    });
    const css = assets[0]!.source;
    expect(css).toContain('--tw-ring-color:');
    expect(css).toContain('var(--tw-ring-color, currentcolor)');
    expect(css).toContain('@property --tw-ring-color');
  });

  it('preserves Tailwind precedence when utilities overlap', async () => {
    const source = `function App(){ return <Foo className="flex block"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    expect(collapse(assets[0]!.source)).toContain(collapse('.foo { display: flex; }'));
  });

  it('removes only exact duplicate declarations after recipe merging', async () => {
    const source = `function App(){ return <Foo className="-translate-x-1/2 -translate-y-1/2"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = assets[0]!.source;
    expect(css).toContain('--tw-translate-x:');
    expect(css).toContain('--tw-translate-y:');
    expect(css.match(/\btranslate:/g)).toHaveLength(1);
  });

  it('materializes shared utilities independently for each semantic target', async () => {
    const source = `function App(){ return <><First className="grid p-2"/><Second className="grid gap-2"/></>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = collapse(assets[0]!.source);
    expect(css).toContain(collapse('.first { padding: calc(var(--spacing, .25rem) * 2); display: grid; }'));
    expect(css).toContain(collapse('.second { gap: calc(var(--spacing, .25rem) * 2); display: grid; }'));
    expect(css).not.toMatch(/\.first,.second|\.second,.first/);
  });

  it('does not combine unrelated semantic targets with identical recipes', async () => {
    const source = `function App(){ return <><First className="grid"/><Second className="grid"/></>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = collapse(assets[0]!.source);
    expect(css).toContain(collapse('.first { display: grid; }'));
    expect(css).toContain(collapse('.second { display: grid; }'));
    expect(css).not.toMatch(/\.first,.second|\.second,.first/);
  });

  it('preserves animation keyframes from the complete Tailwind build', async () => {
    const source = `function App(){ return <Spinner className="animate-spin"/>; }`;
    const { assets } = await compileTailwind(source, { mode: 'extract', design });
    const css = assets[0]!.source;
    expect(css).toContain('.spinner');
    expect(css).toContain('@keyframes spin');
  });

  it('emits shared Tailwind support once for split output', async () => {
    const source = `function App(){ return <><First className="animate-spin"/><Second className="animate-spin"/></>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      emit: { mode: 'split' },
      resolve: {
        element({ componentName, defaultName }) {
          return { className: defaultName, chunk: componentName?.toLowerCase() ?? 'default' };
        },
      },
    });
    const index = assets.find((asset) => asset.fileName === 'input.css')!.source;
    const chunks = assets.filter((asset) => asset.fileName !== 'input.css');
    expect(index.match(/@keyframes spin/g)).toHaveLength(1);
    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      expect(chunk.source).toContain('animation:');
      expect(chunk.source).not.toContain('@keyframes spin');
    }
  });

  it('scopes repeated relationship marker names to their output chunk', async () => {
    const source = `function App(){ return <><AButton className="group/item"><AIcon className="hidden group-data-active/item:block"/></AButton><BButton className="group/item"><BIcon className="hidden group-data-active/item:block"/></BButton></>; }`;
    const { assets } = await compileTailwind(source, {
      mode: 'extract',
      design,
      emit: { mode: 'split' },
      resolve: {
        element({ componentName, defaultName }) {
          return { className: defaultName, chunk: componentName?.startsWith('a-') ? 'a' : 'b' };
        },
      },
    });
    const a = collapse(assets.find((asset) => asset.fileName === 'a.css')!.source);
    const b = collapse(assets.find((asset) => asset.fileName === 'b.css')!.source);
    expect(a).toContain(collapse('.a-icon:is(:where(.a-button)[data-active] *) { display: block; }'));
    expect(b).toContain(collapse('.b-icon:is(:where(.b-button)[data-active] *) { display: block; }'));
    expect(a).not.toContain('.b-button');
    expect(b).not.toContain('.a-button');
  });
});
