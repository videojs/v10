import { describe, expect, it } from 'vite-plus/test';

import {
  BROWSERSLIST_QUERY,
  CSS_REQUIREMENTS,
  cssRequirementSupport,
  featureFirstVersions,
  featureSupport,
  featureUrl,
  firstVersions,
  missingVersions,
  type ResolvedBrowser,
  resolveSupportedBrowsers,
  SUPPORT_BROWSERS,
  supportedCoverage,
  versionNumber,
} from '../browser-support';

describe('versionNumber', () => {
  it('reads the first version of a caniuse range', () => {
    expect(versionNumber('150')).toBe(150);
    expect(versionNumber('17.4')).toBe(17.4);
    expect(versionNumber('15.0-15.1')).toBe(15);
  });
});

describe('resolveSupportedBrowsers', () => {
  it('returns one row per policy browser with a version range', () => {
    const rows = resolveSupportedBrowsers(['last 2 chrome versions', 'last 1 safari version']);
    const chrome = rows.find((row) => row.id === 'chrome')!;
    const safari = rows.find((row) => row.id === 'safari')!;

    expect(rows.map((row) => row.id)).toEqual(SUPPORT_BROWSERS.map((browser) => browser.id));
    expect(chrome.versions).toHaveLength(2);
    expect(versionNumber(chrome.versions[1]!)).toBeGreaterThan(versionNumber(chrome.versions[0]!));
    expect(chrome.range).toBe(`${chrome.versions[0]}–${chrome.versions[1]}`);
    expect(chrome.minimum).toBe(chrome.versions[0]);
    expect(safari.versions).toHaveLength(1);
    expect(safari.range).toBe(safari.versions[0]);
    expect(rows.find((row) => row.id === 'firefox')).toMatchObject({ versions: [], range: '—', minimum: null });
  });

  it('resolves the repository query to a minimum for every policy browser', () => {
    for (const row of resolveSupportedBrowsers(BROWSERSLIST_QUERY)) {
      expect(row.minimum, row.id).not.toBeNull();
    }
  });
});

describe('featureFirstVersions', () => {
  it('reads the first fully supporting version per browser from caniuse-lite', () => {
    const has = featureFirstVersions('css-has');

    expect(has.chrome).toBe('105');
    expect(has.firefox).toBe('121');
    expect(has.safari).toBe('15.4');
  });

  it('reads features caniuse does not track from MDN data', () => {
    expect(featureFirstVersions('popover')).toEqual({
      chrome: '114',
      edge: '114',
      firefox: '125',
      safari: '17',
      ios_saf: '17',
    });
  });

  it('rejects unknown feature ids', () => {
    expect(() => featureFirstVersions('not-a-feature')).toThrow(/Unknown caniuse feature/);
  });
});

describe('featureUrl', () => {
  it('links caniuse features to caniuse.com and the rest to MDN', () => {
    expect(featureUrl('css-has')).toBe('https://caniuse.com/css-has');
    expect(featureUrl('color-mix')).toBe('https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix');
  });
});

describe('featureSupport', () => {
  it('pairs a requirement with its versions and support page', () => {
    const has = featureSupport(CSS_REQUIREMENTS.find((requirement) => requirement.id === 'css-has')!);

    expect(has.firstVersion).toEqual(featureFirstVersions('css-has'));
    expect(has.url).toBe('https://caniuse.com/css-has');
  });
});

describe('firstVersions', () => {
  it('phrases @scope support, which only the registry CSS skins need', () => {
    expect(firstVersions('css-cascade-scope')).toMatch(/^Chrome and Edge 118, Firefox \d+, Safari and iOS 17\.4$/);
  });
});

describe('missingVersions', () => {
  const browsers = (minimums: Record<string, string | null>): ResolvedBrowser[] =>
    resolveSupportedBrowsers().map((browser) => ({ ...browser, minimum: minimums[browser.id] ?? null }));

  it('names the supported versions that lack a feature, grouped like the tables', () => {
    const supported = browsers({ chrome: '111', edge: '111', firefox: '121', safari: '16.4', ios_saf: '16.4' });

    expect(missingVersions('popover', supported)).toBe(
      'Chrome and Edge before 114, Firefox before 125, Safari and iOS before 17'
    );
    expect(missingVersions('light-dark', supported)).toBe('Chrome and Edge before 123, Safari and iOS before 17.5');
  });

  it('names paired browsers separately when they differ', () => {
    const supported = browsers({ chrome: '111', edge: '125', firefox: '147', safari: '26', ios_saf: '26' });

    expect(missingVersions('css-anchor-positioning', supported)).toBe('Chrome before 125');
  });

  it('returns null when every supported version has the feature', () => {
    expect(missingVersions('css-has')).toBeNull();
  });

  it('ignores browsers the query does not name', () => {
    expect(missingVersions('popover', browsers({ chrome: '111' }))).toBe('Chrome before 114');
  });
});

describe('cssRequirementSupport', () => {
  it('resolves every listed requirement, each supported by every supported browser', () => {
    const support = cssRequirementSupport();

    expect(support).toHaveLength(CSS_REQUIREMENTS.length);

    for (const entry of support) {
      for (const browser of SUPPORT_BROWSERS) {
        expect(entry.firstVersion[browser.id], `${entry.requirement.id} ${browser.id}`).not.toBeUndefined();
      }

      expect(missingVersions(entry.requirement.id), entry.requirement.id).toBeNull();
    }
  });
});

describe('supportedCoverage', () => {
  it('covers more usage than the repository query minus its oldest browsers', () => {
    const coverage = supportedCoverage();

    expect(coverage).toBeGreaterThan(supportedCoverage(['last 1 chrome version']));
    expect(coverage).toBeLessThanOrEqual(100);
  });
});
