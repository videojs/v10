import { CDM_PATH, expect, test } from '../fixtures/drm-context';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

const SOURCE = 'hls-drm-axinom-multikey';

test.skip(
  !CDM_PATH,
  'Needs the Widevine CDM from a local Google Chrome install; see suites/drm/fixtures/drm-context.ts.'
);

/**
 * Chromium warns "It is recommended that a robustness level be specified" for any configuration in the _requested_ list
 * that omits `robustness` — not only the one it accepts. Three separate fixes read the accepted configuration instead
 * and each shipped believing the warning was gone, so the assertion here is on what was asked for.
 *
 * The negotiation happens once, during load, so the wrapper has to be installed before any page script runs. That is
 * the whole reason this is an init script rather than something the test evaluates after `goto`.
 */
test('negotiates every key system without an unstamped configuration', async ({ drmContext }) => {
  const page = await drmContext.newPage();

  await page.addInitScript(() => {
    (window as unknown as { __eme: unknown[] }).__eme = [];

    const request = navigator.requestMediaKeySystemAccess.bind(navigator);

    navigator.requestMediaKeySystemAccess = async (keySystem, configurations) => {
      const requested = [...configurations].map((configuration) => [
        ...(configuration.videoCapabilities ?? []),
        ...(configuration.audioCapabilities ?? []),
      ]);

      try {
        const access = await request(keySystem, configurations);
        const accepted = access.getConfiguration();

        (window as unknown as { __eme: unknown[] }).__eme.push({
          keySystem,
          requested: requested.map((capabilities) => capabilities.map((capability) => capability.robustness ?? '')),
          accepted: [...(accepted.videoCapabilities ?? []), ...(accepted.audioCapabilities ?? [])].map(
            (capability) => capability.robustness ?? ''
          ),
        });

        return access;
      } catch (error) {
        (window as unknown as { __eme: unknown[] }).__eme.push({ keySystem, requested: [], refused: true });
        throw error;
      }
    };
  });

  const warnings: string[] = [];

  page.on('console', (message) => {
    if (/robustness/i.test(message.text())) warnings.push(message.text());
  });

  const query = new URLSearchParams({ source: SOURCE, preload: 'auto', autoplay: '0', muted: '1' });

  await page.goto(`${SANDBOX_BASE}/html-hls-video/?${query}`, { waitUntil: 'load' });

  const negotiations = await page.waitForFunction(
    () => {
      const captured = (window as unknown as { __eme: { refused?: boolean }[] }).__eme;

      return captured.some((entry) => !entry.refused) ? captured : null;
    },
    undefined,
    { timeout: 30_000 }
  );
  const captured = (await negotiations.jsonValue()) as {
    keySystem: string;
    requested: string[][];
    accepted?: string[];
    refused?: boolean;
  }[];

  const negotiated = captured.filter((entry) => !entry.refused);

  // Every capability of every *offered* configuration names a tier. The accepted one
  // naming a tier is not enough — that was true through two failed fixes.
  for (const entry of negotiated) {
    for (const configuration of entry.requested) {
      for (const robustness of configuration) {
        expect(robustness, `${entry.keySystem} offered an unstamped capability`).not.toBe('');
      }
    }
  }

  expect(negotiated.length, 'no key system was negotiated').toBeGreaterThan(0);
  expect(warnings, 'Chromium warned about robustness').toEqual([]);
});
