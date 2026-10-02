import { describe, expect, it } from 'vite-plus/test';

import { buildPageTitle } from './title';

describe('buildPageTitle', () => {
  it('uses the default site suffix', () => {
    expect(buildPageTitle('Privacy')).toBe('Privacy | Video.js | Open Source Video Player');
  });

  it('uses a framework-specific suffix without duplicating the site title', () => {
    expect(buildPageTitle('Architecture', { suffix: 'Open Source React Video Player' })).toBe(
      'Architecture | Video.js | Open Source React Video Player'
    );
    expect(buildPageTitle('Video.js', { suffix: 'Open Source HTML Video Player' })).toBe(
      'Video.js | Open Source HTML Video Player'
    );
  });

  it('keeps concise installation titles when the suffix is disabled', () => {
    expect(buildPageTitle('React Installation Guide', { suffix: false })).toBe('React Installation Guide | Video.js');
    expect(buildPageTitle('React Installation Guide | Video.js', { suffix: false })).toBe(
      'React Installation Guide | Video.js'
    );
  });

  it('folds the section into the brand segment', () => {
    expect(buildPageTitle('Video.js v10 is GA', { section: 'Blog' })).toBe(
      'Video.js v10 is GA | Video.js Blog | Open Source Video Player'
    );
    expect(buildPageTitle('Architecture', { section: 'Docs', suffix: 'Open Source React Video Player' })).toBe(
      'Architecture | Video.js Docs | Open Source React Video Player'
    );
    expect(buildPageTitle('React Installation Guide', { section: 'Docs', suffix: false })).toBe(
      'React Installation Guide | Video.js Docs'
    );
  });

  it('collapses a section index title into the brand', () => {
    expect(buildPageTitle('Blog', { section: 'Blog' })).toBe('Video.js Blog | Open Source Video Player');
    expect(buildPageTitle('Video.js Changelog', { section: 'Changelog' })).toBe(
      'Video.js Changelog | Open Source Video Player'
    );
  });
});
