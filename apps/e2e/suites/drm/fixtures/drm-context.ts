import { cpSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { type BrowserContext, chromium, test as base } from '@playwright/test';

/**
 * Where Chrome keeps the Widevine CDM it ships with. Versioned, so the directory is discovered rather than named.
 *
 * MacOS only today. A Linux runner would look under `~/.config/google-chrome/WidevineCdm`; nothing here depends on the
 * path shape beyond "a directory holding `manifest.json` and `_platform_specific/`", so a second branch is all it
 * takes.
 */
function bundledCdm(): string | undefined {
  const versions = resolve(
    '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions'
  );
  if (!existsSync(versions)) return undefined;

  for (const version of readdirSync(versions)) {
    if (version === 'Current') continue;

    const cdm = join(versions, version, 'Libraries/WidevineCdm');
    if (existsSync(join(cdm, 'manifest.json'))) return cdm;
  }

  return undefined;
}

/** Whether this machine can negotiate a real key system at all. Tests gate on it rather than failing. */
export const CDM_PATH = bundledCdm();

/**
 * A Chrome context that can actually negotiate Widevine.
 *
 * Four simpler shapes were measured and all reach ClearKey only: bundled Chromium, `channel: 'chrome'` headless,
 * `channel: 'chrome'` headed with a throwaway profile, and a persistent context without the copy below. The CDM ships
 * inside the app bundle but is not registered into a fresh profile, and Playwright disables the component updater that
 * would fetch it — so the profile needs the CDM copied in _and_ the updater left enabled.
 *
 * Consequences worth knowing before adding cases here: this replaces the injected browser, so the suite's `use: {
 * ...devices }` does not apply; it is headed; and a persistent context is one browser, so these tests run serially.
 */
export const test = base.extend<{ drmContext: BrowserContext }>({
  drmContext: async ({}, use) => {
    if (!CDM_PATH) throw new Error('No Widevine CDM found; gate the test on CDM_PATH.');

    const profile = mkdtempSync(join(tmpdir(), 'videojs-drm-profile-'));

    cpSync(CDM_PATH, join(profile, 'WidevineCdm'), { recursive: true });

    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: ['--disable-component-update', '--disable-component-extensions-with-background-pages'],
    });

    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
