// @vitest-environment node
// Sätteri's native binding builds typed-array buffers that fail against jsdom's
// patched ArrayBuffer/DataView globals; run these against the real node realm.
import { mdxToJs } from 'satteri';
import { describe, expect, it } from 'vitest';
import { satteriConditionalHeadings } from '../satteriConditionalHeadings';

interface Heading {
  depth: number;
  text: string;
  slug: string;
  frameworks?: string[];
  styles?: string[];
}

function collect(source: string): Heading[] {
  const data = {
    astro: {
      frontmatter: {} as Record<string, unknown>,
      headings: [],
      localImagePaths: new Set<string>(),
      remoteImagePaths: new Set<string>(),
    },
  };
  mdxToJs(source, { mdastPlugins: [satteriConditionalHeadings()], data });
  return (data.astro.frontmatter.conditionalHeadings ?? []) as Heading[];
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
