import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CompiledRule } from '../emit';
import { emitCss } from '../emit';

const collapse = (s: string): string => s.replace(/\s+/g, '');

function rule(
  className: string,
  declarations: { property: string; value: string }[],
  variants: any[] = [],
  group?: string
): CompiledRule {
  const utility = { utility: 'mock', branches: [{ declarations, variants }], declarations, variants };
  return group === undefined ? { className, utility } : { className, utility, group };
}

function branchedRule(
  className: string,
  branches: { declarations: { property: string; value: string }[]; variants: any[] }[]
): CompiledRule {
  return {
    className,
    utility: {
      utility: 'mock',
      branches,
      declarations: branches.flatMap((branch) => branch.declarations),
      variants: branches[0]?.variants ?? [],
    },
  };
}

describe('emitCss — merged mode', () => {
  it('emits a single rule for one CompiledRule', async () => {
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'display', value: 'flex' }])],
    });
    expect(out.kind).toBe('merged');
    expect(out.kind === 'merged' && collapse(out.css)).toContain(collapse('.foo{display:flex;}'));
  });

  it('merges declarations across rules sharing the same selector', async () => {
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'display', value: 'flex' }]), rule('foo', [{ property: 'gap', value: '1rem' }])],
    });
    expect(out.kind === 'merged' && collapse(out.css)).toContain(collapse('.foo{display:flex;gap:1rem;}'));
  });

  it('collapses selectors with identical declarations into a comma list', async () => {
    const out = await emitCss({
      rules: [
        rule('foo', [{ property: 'display', value: 'flex' }]),
        rule('bar', [{ property: 'display', value: 'flex' }]),
      ],
    });
    expect(out.kind === 'merged' && collapse(out.css)).toContain(collapse('.bar,.foo{display:flex;}'));
  });

  it('wraps rules in @media at-rule from variants', async () => {
    const variant = {
      kind: 'media' as const,
      atRule: { name: 'media', params: '(prefers-reduced-motion: reduce)' },
      raw: '@media (prefers-reduced-motion: reduce)',
    };
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'opacity', value: '0.5' }], [variant])],
    });
    expect(out.kind === 'merged' && collapse(out.css)).toContain(
      collapse('@media (prefers-reduced-motion: reduce){.foo{opacity:0.5;}}')
    );
  });

  it('appends selector variants to the class selector', async () => {
    const variant = { kind: 'pseudo' as const, selector: ':hover', raw: ':hover' };
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'opacity', value: '1' }], [variant])],
    });
    expect(out.kind === 'merged' && collapse(out.css)).toContain(collapse('.foo:hover{opacity:1;}'));
  });

  it('composes nested at-rule + selector variants', async () => {
    const variants = [
      { kind: 'pseudo' as const, selector: ':hover', raw: ':hover' },
      {
        kind: 'media' as const,
        atRule: { name: 'media', params: '(hover: hover)' },
        raw: '@media (hover: hover)',
      },
    ];
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'opacity', value: '1' }], variants)],
    });
    expect(out.kind === 'merged' && collapse(out.css)).toContain(
      collapse('@media (hover: hover){.foo:hover{opacity:1;}}')
    );
  });

  it('emits each utility branch with its own variant path', async () => {
    const media = {
      kind: 'media' as const,
      atRule: { name: 'media', params: '(width >= 40rem)' },
      raw: '@media (width >= 40rem)',
    };
    const out = await emitCss({
      rules: [
        branchedRule('container', [
          { declarations: [{ property: 'width', value: '100%' }], variants: [] },
          { declarations: [{ property: 'max-width', value: '40rem' }], variants: [media] },
        ]),
      ],
    });
    expect(out.kind === 'merged' && collapse(out.css)).toContain(collapse('.container{width:100%;}'));
    expect(out.kind === 'merged' && collapse(out.css)).toContain(
      collapse('@media (width >= 40rem){.container{max-width:40rem;}}')
    );
  });

  it('sorts declarations alphabetically for stable output', async () => {
    const out = await emitCss({
      rules: [
        rule('foo', [
          { property: 'z-index', value: '1' },
          { property: 'color', value: 'red' },
          { property: 'display', value: 'flex' },
        ]),
      ],
    });
    expect(out.kind === 'merged' && out.css.match(/color/i)!.index! < out.css.match(/display/i)!.index!).toBe(true);
  });
});

describe('emitCss — split mode', () => {
  it('groups rules by group', async () => {
    const out = await emitCss({
      mode: 'split',
      rules: [
        rule('a', [{ property: 'color', value: 'red' }], [], 'one'),
        rule('b', [{ property: 'color', value: 'blue' }], [], 'two'),
      ],
    });
    expect(out.kind).toBe('split');
    if (out.kind !== 'split') return;
    expect(out.groups.size).toBe(2);
    expect(collapse(out.groups.get('one')!)).toContain(collapse('.a{color:red;}'));
    expect(collapse(out.groups.get('two')!)).toContain(collapse('.b{color:blue;}'));
  });

  it('emits an index with @import lines for each group in stable order', async () => {
    const out = await emitCss({
      mode: 'split',
      rules: [
        rule('a', [{ property: 'color', value: 'red' }], [], 'two'),
        rule('b', [{ property: 'color', value: 'blue' }], [], 'one'),
      ],
    });
    if (out.kind !== 'split') throw new Error('expected split');
    const oneIdx = out.index.indexOf('./one.css');
    const twoIdx = out.index.indexOf('./two.css');
    expect(oneIdx).toBeGreaterThan(-1);
    expect(twoIdx).toBeGreaterThan(-1);
    expect(oneIdx).toBeLessThan(twoIdx);
  });

  it('uses safe file stems for empty, reserved, and path-like groups', async () => {
    const out = await emitCss({
      mode: 'split',
      rules: [
        rule('a', [{ property: 'color', value: 'red' }]),
        rule('b', [{ property: 'color', value: 'blue' }], [], 'index'),
        rule('c', [{ property: 'color', value: 'green' }], [], '../controls'),
        rule('d', [{ property: 'color', value: 'purple' }], [], 'controls'),
      ],
    });
    if (out.kind !== 'split') throw new Error('expected split');
    expect([...out.groups.keys()].sort()).toEqual(['_default', '_index', 'controls', 'controls-2']);
    expect(out.index).not.toContain('./index.css');
    expect(out.index).not.toContain('..');
  });
});

describe('emitCss — baseCss prepend', () => {
  it('prepends a single base CSS file (read via Lightning)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'emit-css-'));
    const basePath = join(dir, 'base.css');
    writeFileSync(basePath, '.base { color: green; }', 'utf8');
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'display', value: 'flex' }])],
      baseCss: [basePath],
    });
    expect(out.kind === 'merged' && out.css.indexOf('.base') < out.css.indexOf('.foo')).toBe(true);
  });

  it('flattens @import chains in the base file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'emit-css-import-'));
    const inner = join(dir, 'inner.css');
    const outer = join(dir, 'outer.css');
    writeFileSync(inner, '.from-inner { color: blue; }', 'utf8');
    writeFileSync(outer, '@import "./inner.css";\n.from-outer { color: red; }', 'utf8');
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'display', value: 'flex' }])],
      baseCss: [outer],
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toContain('.from-inner');
    expect(out.css).toContain('.from-outer');
    expect(out.css).not.toContain('@import');
  });

  it('puts baseCss in index only (split mode), not duplicated across groups', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'emit-css-split-base-'));
    const basePath = join(dir, 'base.css');
    writeFileSync(basePath, '.base { color: green; }', 'utf8');
    const out = await emitCss({
      mode: 'split',
      rules: [
        rule('a', [{ property: 'color', value: 'red' }], [], 'one'),
        rule('b', [{ property: 'color', value: 'blue' }], [], 'two'),
      ],
      baseCss: [basePath],
    });
    if (out.kind !== 'split') throw new Error('expected split');
    expect(out.index).toContain('.base');
    expect(out.groups.get('one')!).not.toContain('.base');
    expect(out.groups.get('two')!).not.toContain('.base');
  });

  it('resolves relative baseCss paths against configDir', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'emit-css-relpath-'));
    writeFileSync(join(dir, 'base.css'), '.base { color: green; }', 'utf8');
    const out = await emitCss({
      rules: [rule('foo', [{ property: 'display', value: 'flex' }])],
      baseCss: ['./base.css'],
      configDir: dir,
    });
    expect(out.kind === 'merged' && out.css).toContain('.base');
  });
});

describe('emitCss — hoist', () => {
  it('hoists a CSS variable that is uniform across rules to the root selector', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'display', value: 'flex' },
        ]),
        rule('b', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'color', value: 'red' },
        ]),
      ],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('.skin{--tw-border-style:none;}'));
    expect(out.css).toMatch(/\.a\s*{\s*display:\s*flex;\s*}/);
    expect(out.css).toMatch(/\.b\s*{\s*color:\s*red;\s*}/);
    // Hoisted value should not appear in either per-rule body.
    expect(/\.a\s*{[^}]*--tw-border-style/.test(out.css)).toBe(false);
    expect(/\.b\s*{[^}]*--tw-border-style/.test(out.css)).toBe(false);
  });

  it('does not hoist a variable whose value differs across rules', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [{ property: '--tw-duration', value: '150ms' }]),
        rule('b', [{ property: '--tw-duration', value: '300ms' }]),
      ],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/\.a\s*{[^}]*--tw-duration:\s*150ms/);
    expect(out.css).toMatch(/\.b\s*{[^}]*--tw-duration:\s*300ms/);
    expect(/\.skin\s*{[^}]*--tw-duration/.test(out.css)).toBe(false);
  });

  it('merges hoisted declarations into an existing rule on the root selector', async () => {
    const out = await emitCss({
      rules: [
        rule('skin', [{ property: 'display', value: 'block' }]),
        rule('a', [{ property: '--tw-border-style', value: 'none' }]),
        rule('b', [{ property: '--tw-border-style', value: 'none' }]),
      ],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('.skin{--tw-border-style:none;display:block;}'));
  });

  it('drops a rule whose declarations were entirely hoisted', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [{ property: '--tw-border-style', value: 'none' }]),
        rule('b', [{ property: '--tw-border-style', value: 'none' }]),
      ],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).not.toMatch(/\.a\s*{/);
    expect(out.css).not.toMatch(/\.b\s*{/);
    expect(collapse(out.css)).toContain(collapse('.skin{--tw-border-style:none;}'));
  });

  it('puts the hoist root rule first in the output', async () => {
    const out = await emitCss({
      rules: [
        rule('z-last', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'display', value: 'flex' },
        ]),
        rule('a-first', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'color', value: 'red' },
        ]),
      ],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    const skinIdx = out.css.indexOf('.skin');
    const otherIdx = out.css.indexOf('.a-first');
    expect(skinIdx).toBeGreaterThanOrEqual(0);
    expect(otherIdx).toBeGreaterThan(skinIdx);
  });

  it('leaves rules untouched when hoist is false', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'display', value: 'flex' },
        ]),
        rule('b', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'color', value: 'red' },
        ]),
      ],
      hoist: false,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/\.a\s*{[^}]*--tw-border-style/);
    expect(out.css).toMatch(/\.b\s*{[^}]*--tw-border-style/);
  });

  it('does not hoist a property that only appears inside an at-rule wrapper', async () => {
    const motionVariant = {
      kind: 'media' as const,
      atRule: { name: 'media', params: '(prefers-reduced-motion: reduce)' },
      raw: '@media (prefers-reduced-motion: reduce)',
    };
    const out = await emitCss({
      rules: [rule('a', [{ property: '--media-error-dialog-transition-duration', value: '50ms' }], [motionVariant])],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(/\.skin\s*{[^}]*--media-error-dialog-transition-duration/.test(out.css)).toBe(false);
  });

  it('does not hoist a property that only appears on a selector variant', async () => {
    const fullscreenVariant = { kind: 'pseudo' as const, selector: ':fullscreen', raw: ':fullscreen' };
    const out = await emitCss({
      rules: [rule('a', [{ property: '--media-border-radius', value: '0' }], [fullscreenVariant])],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/\.a:fullscreen\s*{[^}]*--media-border-radius:\s*0/);
    expect(/\.skin\s*{[^}]*--media-border-radius/.test(out.css)).toBe(false);
  });

  it('only hoists CSS custom properties (no plain props)', async () => {
    const out = await emitCss({
      rules: [rule('a', [{ property: 'color', value: 'red' }]), rule('b', [{ property: 'color', value: 'red' }])],
      hoist: { rootSelector: '.skin' },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    // Plain `color` should remain on each rule, not hoist into `.skin`.
    expect(out.css).toMatch(/\.a[^{]*{[^}]*color:\s*red/);
    expect(out.css).toMatch(/\.b[^{]*{[^}]*color:\s*red/);
    expect(/\.skin\s*{[^}]*color:\s*red/.test(out.css)).toBe(false);
  });
});

describe('emitCss — inlineVars', () => {
  it('inlines a `--tw-*` reference and drops the setter declaration', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'border-style', value: 'var(--tw-border-style)' },
        ]),
      ],
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/border-style:\s*none/);
    expect(out.css).not.toMatch(/--tw-border-style:/);
    expect(out.css).not.toMatch(/var\(--tw-border-style/);
  });

  it('keeps `var()` fallback when the property is unset', async () => {
    const out = await emitCss({
      rules: [rule('a', [{ property: 'border-style', value: 'var(--tw-border-style, solid)' }])],
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/border-style:\s*solid/);
  });

  it('leaves the var() reference alone when no fallback is set', async () => {
    const out = await emitCss({
      rules: [rule('a', [{ property: 'border-style', value: 'var(--tw-border-style)' }])],
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/border-style:\s*var\(--tw-border-style\)/);
  });

  it('resolves nested setter chains', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-shadow-color', value: 'red' },
          { property: '--tw-shadow', value: 'inset 0 1px var(--tw-shadow-color)' },
          { property: 'box-shadow', value: 'var(--tw-shadow)' },
        ]),
      ],
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/box-shadow:\s*inset 0 1px red/);
    expect(out.css).not.toMatch(/--tw-/);
  });

  it('does not inline non-matching properties (default --tw-* matcher)', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--media-color', value: 'red' },
          { property: 'color', value: 'var(--media-color)' },
        ]),
      ],
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/--media-color:\s*red/);
    expect(out.css).toMatch(/color:\s*var\(--media-color\)/);
  });

  it('honours a custom RegExp matcher', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--media-color', value: 'red' },
          { property: 'color', value: 'var(--media-color)' },
        ]),
      ],
      inlineVars: /^--media-/,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/color:\s*red/);
    expect(out.css).not.toMatch(/--media-color:/);
  });

  it('per-rule scope: a setter in one rule does not affect another', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-x', value: '1px' },
          { property: 'margin', value: 'var(--tw-x)' },
        ]),
        rule('b', [{ property: 'padding', value: 'var(--tw-x)' }]),
      ],
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/\.a\s*{\s*margin:\s*1px;?\s*}/);
    expect(out.css).toMatch(/\.b\s*{\s*padding:\s*var\(--tw-x\);?\s*}/);
  });

  it('leaves rules untouched when inlineVars is omitted', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-border-style', value: 'none' },
          { property: 'border-style', value: 'var(--tw-border-style)' },
        ]),
      ],
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/--tw-border-style:\s*none/);
    expect(out.css).toMatch(/border-style:\s*var\(--tw-border-style\)/);
  });

  it('inlines a setter from the hoist root into a consumer in a separate rule', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [{ property: '--tw-outline-style', value: 'none' }]),
        rule('b', [{ property: 'outline-style', value: 'var(--tw-outline-style)' }]),
      ],
      hoist: { rootSelector: '.skin' },
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    // After hoist, --tw-outline-style: none lifts to .skin; inline then
    // resolves consumers anywhere by reading from the root setters.
    expect(out.css).toMatch(/\.b\s*{\s*outline-style:\s*none;?\s*}/);
    expect(out.css).not.toMatch(/--tw-outline-style/);
  });

  it('runs alongside hoist; --tw-* gets resolved, other vars hoist', async () => {
    const out = await emitCss({
      rules: [
        rule('a', [
          { property: '--tw-border-style', value: 'none' },
          { property: '--media-color', value: 'red' },
          { property: 'border-style', value: 'var(--tw-border-style)' },
          { property: 'color', value: 'var(--media-color)' },
        ]),
        rule('b', [
          { property: '--tw-border-style', value: 'none' },
          { property: '--media-color', value: 'red' },
          { property: 'background', value: 'var(--media-color)' },
        ]),
      ],
      hoist: { rootSelector: '.skin' },
      inlineVars: true,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    // --tw-* gone everywhere.
    expect(out.css).not.toMatch(/--tw-border-style/);
    // --media-color still hoists since it's not in the matcher.
    expect(collapse(out.css)).toContain(collapse('.skin{--media-color:red;}'));
    // Consumers stay on their rules.
    expect(out.css).toMatch(/\.a\s*{[^}]*border-style:\s*none/);
    expect(out.css).toMatch(/\.a\s*{[^}]*color:\s*var\(--media-color\)/);
  });
});

describe('emitCss — theme variables', () => {
  it('emits a :root block defining referenced theme variables', async () => {
    const out = await emitCss({
      rules: [rule('box', [{ property: 'padding', value: 'calc(var(--spacing) * 1)' }])],
      resolveThemeVar: (name) => (name === '--spacing' ? '0.25rem' : undefined),
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse(':root {\n  --spacing: 0.25rem;\n}'));
    // Theme block precedes the rules that consume it.
    expect(out.css.indexOf('--spacing: 0.25rem')).toBeLessThan(out.css.indexOf('.box'));
  });

  it('resolves theme variables transitively', async () => {
    const out = await emitCss({
      rules: [rule('box', [{ property: 'color', value: 'var(--brand)' }])],
      resolveThemeVar: (name) =>
        name === '--brand' ? 'var(--brand-500)' : name === '--brand-500' ? '#09f' : undefined,
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('--brand: var(--brand-500);'));
    expect(collapse(out.css)).toContain(collapse('--brand-500: #09f;'));
  });

  it('does not redeclare variables the rules already define', async () => {
    const out = await emitCss({
      rules: [
        rule('box', [
          { property: '--spacing', value: '1rem' },
          { property: 'padding', value: 'var(--spacing)' },
        ]),
      ],
      resolveThemeVar: () => '0.25rem',
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    // The locally-declared --spacing wins; no :root override is emitted.
    expect(out.css).not.toMatch(/:root/);
  });

  it('scopes the theme block to a custom selector', async () => {
    const out = await emitCss({
      rules: [rule('box', [{ property: 'gap', value: 'var(--spacing)' }])],
      resolveThemeVar: (name) => (name === '--spacing' ? '0.25rem' : undefined),
      themeSelector: '[data-skin="x"]',
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('[data-skin="x"] {\n  --spacing: 0.25rem;\n}'));
  });

  it('omits the theme block when no resolver is provided (back-compat)', async () => {
    const out = await emitCss({
      rules: [rule('box', [{ property: 'gap', value: 'var(--spacing)' }])],
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).not.toMatch(/:root/);
  });
});

describe('emitCss — registered @property variables', () => {
  // The `after:absolute` pattern: an `::after` rule that references
  // `--tw-content` but never sets it, relying on Tailwind's @property default.
  const contentRule = (): CompiledRule => ({
    className: 'card',
    utility: {
      utility: 'after:absolute',
      declarations: [
        { property: 'content', value: 'var(--tw-content)' },
        { property: 'position', value: 'absolute' },
      ],
      branches: [
        {
          declarations: [
            { property: 'content', value: 'var(--tw-content)' },
            { property: 'position', value: 'absolute' },
          ],
          variants: [{ kind: 'pseudo', selector: '::after', raw: '::after' }],
        },
      ],
      variants: [{ kind: 'pseudo', selector: '::after', raw: '::after' }],
      properties: [{ name: '--tw-content', syntax: '"*"', inherits: false, initialValue: '""' }],
    },
  });

  it("mode 'inline' substitutes the initial-value and drops the dangling reference", async () => {
    const out = await emitCss({ rules: [contentRule()], properties: { mode: 'inline' } });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('content: "";'));
    expect(out.css).not.toMatch(/var\(--tw-content\)/);
  });

  it("mode 'emit' emits an @property rule and keeps the reference", async () => {
    const out = await emitCss({ rules: [contentRule()], properties: { mode: 'emit' } });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(
      collapse('@property --tw-content {\n  syntax: "*";\n  inherits: false;\n  initial-value: "";\n}')
    );
    expect(out.css).toMatch(/var\(--tw-content\)/);
  });

  it('lets the resolve hook override the initial-value (inline)', async () => {
    const out = await emitCss({
      rules: [contentRule()],
      properties: {
        mode: 'inline',
        variables: [
          {
            match: /^--tw-/,
            resolve: (name, captured) => (name === '--tw-content' ? { ...captured, initialValue: '"!"' } : undefined),
          },
        ],
      },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('content: "!";'));
  });

  it('lets the resolve hook override descriptors (emit)', async () => {
    const out = await emitCss({
      rules: [contentRule()],
      properties: {
        mode: 'emit',
        variables: [
          {
            match: /^--tw-/,
            resolve: () => ({ syntax: '"<length>"', inherits: true, initialValue: '0px' }),
          },
        ],
      },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(
      collapse('@property --tw-content {\n  syntax: "<length>";\n  inherits: true;\n  initial-value: 0px;\n}')
    );
  });

  it('honours the match filter (leaves non-matching variables alone)', async () => {
    const out = await emitCss({
      rules: [contentRule()],
      properties: { mode: 'inline', variables: [{ match: /^--brand-/ }] },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/var\(--tw-content\)/);
  });

  it('uses resolver-supplied inline defaults for uncaptured variables', async () => {
    const out = await emitCss({
      rules: [
        rule('card', [
          { property: 'content', value: 'var(--brand-content)' },
          { property: 'display', value: 'block' },
        ]),
      ],
      properties: {
        mode: 'inline',
        variables: [
          {
            match: /^--brand-/,
            resolve: (name) => (name === '--brand-content' ? { initialValue: '"brand"' } : undefined),
          },
        ],
      },
    });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(collapse(out.css)).toContain(collapse('content: "brand";'));
    expect(out.css).not.toMatch(/var\(--brand-content\)/);
  });

  it('leaves variables untouched when no properties option is given (back-compat)', async () => {
    const out = await emitCss({ rules: [contentRule()] });
    if (out.kind !== 'merged') throw new Error('expected merged');
    expect(out.css).toMatch(/var\(--tw-content\)/);
    expect(out.css).not.toMatch(/@property/);
  });
});
