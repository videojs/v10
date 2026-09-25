import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { describe, expect, it } from 'vite-plus/test';

import { lowerStyles } from '../lower';

const targets = browserslistToTargets(
  browserslist(['chrome >= 111', 'firefox >= 121', 'safari >= 16.4', 'ios_saf >= 16.4'])
);

function lower(css: string): string {
  return lowerStyles(css, { targets }).replace(/\s+/g, ' ');
}

describe('lowerStyles', () => {
  it('flattens nesting and adds the vendor prefixes the targets need', () => {
    const css = lower('.a { & .b { backdrop-filter: blur(2px); mask-image: linear-gradient(red, blue); } }');

    expect(css).toContain('.a .b {');
    expect(css).toContain('-webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);');
    expect(css).toContain('-webkit-mask-image');
  });

  it('keeps `:dir()` for every browser instead of rewriting it to `:lang()`', () => {
    const css = lower('.a:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { translate: -100%; }');

    expect(css).toContain(':dir(rtl)');
    expect(css).not.toContain(':lang(');
  });

  it('leaves color functions it cannot lower for the source to guard', () => {
    const css = lower(
      '@supports (color: light-dark(red, red)) { .a { --b: light-dark(#111, #eee); } } .c { --d: contrast-color(red); --e: oklch(from var(--f) l c h / 0.5); }'
    );

    expect(css).toContain('--b: light-dark(#111, #eee);');
    expect(css).not.toContain('--lightningcss-light');
    expect(css).toContain('--d: contrast-color(red);');
    expect(css).toContain('--e: oklch(from var(--f) l c h / .5);');
    expect(css.match(/@supports/g)).toHaveLength(1);
  });
});
