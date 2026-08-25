// @vitest-environment node
// Sätteri's native binding builds typed-array buffers that fail against jsdom's
// patched ArrayBuffer/DataView globals; run these against the real node realm.
import { mdxToJs } from 'satteri';
import { describe, expect, it } from 'vite-plus/test';

import { isNumber, isPlainObject, isString } from '../../../../packages/utils/src/predicate/index';
import { satteriConditionalHeadings } from '../satteriConditionalHeadings';
import type { SiteDataObject, SiteDataValue } from '../site-data-value';

interface Heading extends SiteDataObject {
  depth: number;
  text: string;
  slug: string;
  frameworks?: string[];
  styles?: string[];
}

function isHeading(value: SiteDataValue): value is Heading {
  return isPlainObject(value) && isNumber(value.depth) && isString(value.text) && isString(value.slug);
}

function collect(source: string): Heading[] {
  const frontmatter: Record<string, import('../site-data-value').SiteDataValue> = {};
  const data = {
    astro: {
      frontmatter,
      headings: [],
      localImagePaths: new Set<string>(),
      remoteImagePaths: new Set<string>(),
    },
  };
  mdxToJs(source, { mdastPlugins: [satteriConditionalHeadings()], data });
  const headings = data.astro.frontmatter.conditionalHeadings;
  return Array.isArray(headings) ? headings.filter(isHeading) : [];
}

describe('satteriConditionalHeadings', () => {
  it('collects headings with github-style slugs in document order', () => {
    const headings = collect('## Hello World\n\n### Nested Heading');
    expect(headings).toEqual([
      { depth: 2, text: 'Hello World', slug: 'hello-world' },
      { depth: 3, text: 'Nested Heading', slug: 'nested-heading' },
    ]);
  });

  it('attaches framework context from an enclosing FrameworkCase', () => {
    const headings = collect(
      '## Shared\n\n<FrameworkCase frameworks={["react"]}>\n\n## React Only\n\n</FrameworkCase>'
    );
    expect(headings.find((h) => h.text === 'Shared')?.frameworks).toBeUndefined();
    expect(headings.find((h) => h.text === 'React Only')?.frameworks).toEqual(['react']);
  });

  it('attaches style context from an enclosing StyleCase', () => {
    const headings = collect('<StyleCase styles={["css"]}>\n\n## CSS Only\n\n</StyleCase>');
    expect(headings.find((h) => h.text === 'CSS Only')?.styles).toEqual(['css']);
  });
});
