// @vitest-environment node
// Sätteri's native binding builds typed-array buffers that fail against jsdom's
// patched ArrayBuffer/DataView globals; run these against the real node realm.
import { mdxToJs } from 'satteri';
import { describe, expect, it } from 'vite-plus/test';

import { satteriRelatedLinks } from '../satteriRelatedLinks';

function compile(source: string): string {
  const data = {
    astro: {
      frontmatter: {},
      headings: [],
      localImagePaths: new Set<string>(),
      remoteImagePaths: new Set<string>(),
    },
  };
  const { code } = mdxToJs(source, { mdastPlugins: [satteriRelatedLinks()], data });

  return code;
}

const related = `## Related guides

- <DocsLink slug="concepts/features">Features</DocsLink>
- <DocsLink slug="guides/autoplay" anchor="how-it-works">Autoplay</DocsLink>
`;

describe('satteriRelatedLinks', () => {
  it('replaces a DocsLink list under a Related heading with RelatedLinks', () => {
    const code = compile(related);

    expect(code).toContain('RelatedLinks');
    expect(code).toContain('concepts/features');
    expect(code).toContain('how-it-works');
    expect(code).not.toContain('DocsLink');
  });

  it('leaves lists under other headings alone', () => {
    const code = compile('## Steps\n\n- <DocsLink slug="concepts/features">Features</DocsLink>\n');

    expect(code).not.toContain('RelatedLinks');
    expect(code).toContain('DocsLink');
  });

  it('leaves a related list alone when an item is not a lone DocsLink', () => {
    const code = compile('## Related guides\n\n- <DocsLink slug="concepts/features">Features</DocsLink> and more\n');

    expect(code).not.toContain('RelatedLinks');
  });
});
