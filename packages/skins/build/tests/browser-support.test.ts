import { existsSync, globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import browserslist from 'browserslist';
import { describe, expect, it } from 'vite-plus/test';

import { auditSkinCss } from '../browser-support.ts';

const workspaceDir = resolve(import.meta.dirname, '../../../..');
const browsers = browserslist(undefined, { path: workspaceDir });

/** Relative colors the skins accept losing: they change their origin's channels, so no `color-mix()` stands in. */
const ACCEPTED_DEGRADATIONS = ['--media-shadow-current-color'];

const floor = ['chrome 111', 'firefox 121', 'safari 16.4'];

describe('auditSkinCss', () => {
  it('reports nesting and features the browsers lack', () => {
    const { problems } = auditSkinCss('@scope (.a) { .b { color: red; } } .c { & .d { color: red; } } @layer x {}', [
      'chrome 98',
    ]);

    expect(problems).toContain('@scope is unsupported in chrome 98');
    expect(problems.some((problem) => problem.includes('is still nested'))).toBe(true);
    expect(problems).toContain('@layer is unsupported in chrome 98');
  });

  it('requires `light-dark()` and `contrast-color()` behind an `@supports` check that names them', () => {
    const unguarded = auditSkinCss('.a { --b: light-dark(red, blue); --c: contrast-color(red); }', floor);
    const fallbackGuarded = auditSkinCss(
      '.a { --b: light-dark(red, blue); } @supports not (color: light-dark(red, red)) { .a { --b: red; } }',
      floor
    );
    const guarded = auditSkinCss(
      '.a { --b: red; --c: currentColor; } @supports (color: light-dark(red, red)) { .a { --b: light-dark(red, blue); } } @supports (color: contrast-color(red)) { .a { --c: contrast-color(red); } }',
      floor
    );

    expect(unguarded.problems).toHaveLength(2);
    expect(fallbackGuarded.problems).toHaveLength(1);
    expect(guarded.problems).toEqual([]);
  });

  it('requires a fallback for gradient interpolation but not for color-mix() inside a gradient', () => {
    const { problems } = auditSkinCss(
      '.a { --b: linear-gradient(to top in oklab, red, blue); --c: linear-gradient(color-mix(in oklab, red 50%, blue), blue); }',
      floor
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('gradient interpolation');
  });

  it('reports `color: color-mix()` of `currentcolor` outside the WebKit 16 guard', () => {
    const mix = '.a { color: color-mix(in oklab, currentcolor 65%, transparent); }';

    expect(auditSkinCss(mix, floor).problems).toHaveLength(1);
    expect(auditSkinCss(`@supports (contain-intrinsic-size: auto 1px) { ${mix} }`, floor).problems).toEqual([]);
  });

  it('reports relative colors without a fallback as degradations', () => {
    const { problems, degraded } = auditSkinCss('.a { --b: oklch(from currentColor 0 0 0 / 0.1); }', floor);

    expect(problems).toEqual([]);
    expect(degraded).toEqual(['--b']);
  });

  it('requires an attribute alternative beside `:dir()` and a fallback for `@property` variables', () => {
    const { problems } = auditSkinCss(
      '@property --p { syntax: "<percentage>"; inherits: true; initial-value: 0%; } .a:dir(rtl) { left: var(--p); } .b:where(:dir(rtl), [dir="rtl"]) { left: var(--p, 0%); }',
      floor
    );

    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('`var(--p)` has no fallback');
    expect(problems[1]).toContain('`:dir()`');
  });

  it('pairs each prefixed property with its `-webkit-` form in the Tailwind utilities', () => {
    // Tailwind emits `@utility` bodies as written, and Lightning CSS cannot lower them before they ship.
    const utilities = readFileSync(resolve(workspaceDir, 'packages/skins/src/styles/tailwind.css'), 'utf8');

    for (const property of ['backdrop-filter', 'mask-image', 'mask-position', 'mask-repeat']) {
      const plain = utilities.match(new RegExp(`(?<![-\\w])${property}:`, 'g'))?.length ?? 0;
      const prefixed = utilities.match(new RegExp(`-webkit-${property}:`, 'g'))?.length ?? 0;

      expect(prefixed, property).toBe(plain);
    }
  });

  it('passes every generated skin stylesheet for the workspace browserslist', () => {
    const files = [
      ...globSync('packages/html/src/internal/skins/*/skin.css', { cwd: workspaceDir }),
      ...globSync('packages/react/src/presets/*/{skin,minimal-skin}.css', { cwd: workspaceDir }).filter(
        (file) => !file.includes('/background/')
      ),
    ];

    expect(files.length, 'Generate the skins first: pnpm exec vp run @videojs/skins#generate').toBe(16);

    for (const file of files) {
      const path = resolve(workspaceDir, file);
      const audit = existsSync(path) ? auditSkinCss(readFileSync(path, 'utf8'), browsers) : undefined;

      expect(audit?.problems, file).toEqual([]);
      expect(
        audit?.degraded.filter((name) => !ACCEPTED_DEGRADATIONS.includes(name)),
        file
      ).toEqual([]);
    }
  });
});
