import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { decompose } from '../decompose';
import type { DesignSystem } from '../design-system';
import { loadDesignSystem } from '../design-system';

let design: DesignSystem;

const MINIMAL_CSS = `
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.7 0.2 250);
  --media-color-primary: oklch(1 0 0);
}
`;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'compiler-tw-'));
  const cssPath = join(dir, 'tailwind.css');
  writeFileSync(cssPath, MINIMAL_CSS, 'utf8');
  design = await loadDesignSystem(cssPath);
}, 30_000);

describe('decompose — base utilities', () => {
  it('handles a plain utility', () => {
    const r = decompose('flex', design);
    expect(r).not.toBeNull();
    expect(r!.utility).toBe('flex');
    expect(r!.variants).toEqual([]);
    expect(r!.declarations).toEqual([{ property: 'display', value: 'flex' }]);
  });

  it('handles a utility with multiple declarations', () => {
    const r = decompose('p-4', design);
    expect(r).not.toBeNull();
    // Tailwind v4 emits `padding: calc(var(--spacing) * 4);`.
    const props = r!.declarations.map((d) => d.property);
    expect(props).toContain('padding');
  });

  it('returns null for unknown utilities', () => {
    expect(decompose('not-a-real-utility', design)).toBeNull();
  });
});

describe('decompose — variants', () => {
  it('captures :hover as a pseudo variant', () => {
    const r = decompose('hover:opacity-100', design);
    expect(r).not.toBeNull();
    // Tailwind v4 nests `&:hover` *inside* `@media (hover: hover)` so we
    // see both — pseudo for the selector tail, media for the hover gate.
    const pseudo = r!.variants.find((v) => v.kind === 'pseudo');
    expect(pseudo).toBeDefined();
    expect(pseudo!.selector).toMatch(/:hover/);
    const media = r!.variants.find((v) => v.kind === 'media');
    expect(media).toBeDefined();
    expect(media!.atRule!.params).toContain('hover');
    expect(r!.declarations[0]).toMatchObject({ property: 'opacity', value: '100%' });
  });

  it('captures :focus-visible as a pseudo variant', () => {
    const r = decompose('focus-visible:outline-current', design);
    expect(r).not.toBeNull();
    expect(r!.variants[0]!.kind).toBe('pseudo');
    expect(r!.variants[0]!.selector).toMatch(/:focus-visible/);
  });

  it('captures @media-style at-rule wrappers', () => {
    const r = decompose('motion-reduce:opacity-50', design);
    expect(r).not.toBeNull();
    const media = r!.variants.find((v) => v.kind === 'media');
    expect(media).toBeDefined();
    expect(media!.atRule!.params).toContain('reduce');
  });

  it('captures attribute-selector variants from data-[…]', () => {
    const r = decompose('data-[state=open]:opacity-100', design);
    expect(r).not.toBeNull();
    const attr = r!.variants.find((v) => v.kind === 'attribute');
    expect(attr).toBeDefined();
    expect(attr!.selector).toContain('[data-state=');
  });

  it('captures group-data variants', () => {
    const r = decompose('group-data-paused:opacity-100', design);
    expect(r).not.toBeNull();
    const grp = r!.variants.find((v) => v.kind === 'group');
    expect(grp).toBeDefined();
    expect(grp!.selector).toContain('group');
  });
});

describe('decompose — @property registrations', () => {
  it('captures the @property rule Tailwind appends for a slot', () => {
    const r = decompose('before:content-["x"]', design);
    expect(r).not.toBeNull();
    const content = r!.properties?.find((p) => p.name === '--tw-content');
    expect(content).toEqual({
      name: '--tw-content',
      syntax: '"*"',
      inherits: false,
      initialValue: '""',
    });
  });

  it('omits `properties` when a utility registers none', () => {
    const r = decompose('flex', design);
    expect(r!.properties).toBeUndefined();
  });
});

describe('decompose — caching', () => {
  it('returns the same compiled CSS on repeat lookups (DesignSystem cache)', () => {
    const a = design.compileUtility('flex');
    const b = design.compileUtility('flex');
    expect(a).toBe(b);
  });
});
