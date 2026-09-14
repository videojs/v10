import { describe, expect, it } from 'vite-plus/test';

import type { Sidebar } from '../../../types/docs';
import { collectDocsRedirects, getRedirectedSlugs } from '../redirects';

const sidebar: Sidebar = [
  {
    sidebarLabel: 'Tooling',
    contents: [
      { slug: 'guides/content-security-policy', redirectFrom: ['concepts/security'] },
      { slug: 'reference/cdn', frameworks: ['html'], redirectFrom: ['concepts/cdn'] },
      { slug: 'guides/autoplay' },
      { href: 'https://example.com', sidebarLabel: 'Outbound' },
    ],
  },
  {
    sidebarLabel: 'HTML only',
    frameworks: ['html'],
    contents: [{ slug: 'guides/self-hosting', redirectFrom: ['concepts/self-hosting', 'guides/self-host'] }],
  },
];

describe('collectDocsRedirects', () => {
  it('emits a page and markdown redirect per framework the page renders in', () => {
    const redirects = collectDocsRedirects(sidebar, ['react', 'html']);

    expect(redirects).toContainEqual({
      from: '/docs/framework/react/concepts/security',
      to: '/docs/framework/react/guides/content-security-policy',
    });
    expect(redirects).toContainEqual({
      from: '/docs/framework/html/concepts/security.md',
      to: '/docs/framework/html/guides/content-security-policy.md',
    });
  });

  it('respects framework restrictions on the guide and its ancestors', () => {
    const redirects = collectDocsRedirects(sidebar, ['react', 'html']);
    const froms = redirects.map((redirect) => redirect.from);

    expect(froms).toContain('/docs/framework/html/concepts/cdn');
    expect(froms).not.toContain('/docs/framework/react/concepts/cdn');
    expect(froms).toContain('/docs/framework/html/concepts/self-hosting');
    expect(froms).not.toContain('/docs/framework/react/guides/self-host');
  });

  it('ignores guides without redirects and outbound links', () => {
    const redirects = collectDocsRedirects(sidebar, ['react', 'html']);

    expect(redirects.every((redirect) => !redirect.to.endsWith('/guides/autoplay'))).toBe(true);
    expect(redirects).toHaveLength(2 * 2 + 2 + 2 * 2);
  });
});

describe('getRedirectedSlugs', () => {
  it('lists every old slug declared in the sidebar', () => {
    expect(getRedirectedSlugs(sidebar)).toEqual([
      'concepts/security',
      'concepts/cdn',
      'concepts/self-hosting',
      'guides/self-host',
    ]);
  });
});
