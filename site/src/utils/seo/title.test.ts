import { describe, expect, it } from 'vite-plus/test';

import { buildPageTitle } from './title';

describe('buildPageTitle', () => {
  it('uses the default site suffix', () => {
    expect(buildPageTitle('Blog')).toBe('Blog | Video.js | Open Source Video Player');
  });

  it('uses a framework-specific suffix without duplicating the site title', () => {
    expect(buildPageTitle('Architecture', 'Open Source React Video Player')).toBe(
      'Architecture | Video.js | Open Source React Video Player'
    );
    expect(buildPageTitle('Video.js', 'Open Source HTML Video Player')).toBe(
      'Video.js | Open Source HTML Video Player'
    );
  });

  it('keeps concise installation titles when the suffix is disabled', () => {
    expect(buildPageTitle('React Installation Guide', false)).toBe('React Installation Guide | Video.js');
    expect(buildPageTitle('React Installation Guide | Video.js', false)).toBe('React Installation Guide | Video.js');
  });
});
