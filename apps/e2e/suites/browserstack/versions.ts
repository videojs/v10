import browserslist from 'browserslist';

import rootPackage from '../../../../package.json' with { type: 'json' };

export interface Versions {
  chrome: string;
  edge: string;
  firefox: string;
  safari: string;
  ios: string;
}

function resolveVersions(query: readonly string[]): Versions {
  const browsers = browserslist([...query]);

  function minimum(name: string): string {
    const version = browsers
      .filter((entry) => entry.startsWith(`${name} `))
      .map((entry) => entry.slice(name.length + 1).split('-')[0]!)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
    if (!version) throw new Error(`The browserslist query has no supported ${name} version.`);

    return version;
  }

  return {
    chrome: minimum('chrome'),
    edge: minimum('edge'),
    firefox: minimum('firefox'),
    safari: minimum('safari'),
    // BrowserStack selects iOS by major version; round up to stay within the supported range.
    ios: String(Math.ceil(Number(minimum('ios_saf')))),
  };
}

/** Minimums for every skin, from the root `browserslist`. */
export const versions = resolveVersions(rootPackage.browserslist);

/** Minimums for the Compat skins, from the root `compatBrowserslist`. */
export const compatVersions = resolveVersions(rootPackage.compatBrowserslist);
