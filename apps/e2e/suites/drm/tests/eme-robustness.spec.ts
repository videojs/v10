import { CDM_PATH, expect, test } from '../fixtures/drm-context';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

/** Key systems that declare a robustness ladder, and so must never offer an unstamped capability. */
const LADDERED_KEY_SYSTEMS = new Set(['com.widevine.alpha']);

/**
 * Every protected source the SPF HLS media offers. Parameterized rather than pinned to one: what varies between them is
 * the key systems named, the encryption scheme, and whether the license servers are derived from a Mux token or named
 * outright — all inputs to the configuration this asserts on.
 *
 * `negotiates` is whether any key system is a candidate — i.e. whether a request is made at all, not whether it
 * succeeds. A source scoped to FairPlay or PlayReady still asks and is refused on Chromium, which is worth covering:
 * those modules declare no ladder, so their request is the one place an unstamped configuration is legitimate. A source
 * naming no license server has no candidate at all and asks for nothing.
 */
const SOURCES = [
  { id: 'hls-drm', negotiates: true, note: 'Mux token, all three key systems derived' },
  { id: 'hls-drm-widevine-cwip', negotiates: true, note: 'Widevine, cenc — the scheme Mux cbcs content never reaches' },
  { id: 'hls-drm-axinom', negotiates: true, note: 'Widevine, cbcs, entitlement header' },
  { id: 'hls-drm-axinom-multikey', negotiates: true, note: 'Widevine, cbcs, one key per rung' },
  { id: 'hls-drm-unlicensed', negotiates: false, note: 'names no license server, so no key system is a candidate' },
  { id: 'hls-drm-ezdrm', negotiates: true, note: 'FairPlay only — asked for, and refused, on Chromium' },
  { id: 'hls-drm-playready-msft', negotiates: true, note: 'PlayReady only — asked for, and refused, on Chromium' },
] as const;

type Negotiation = { keySystem: string; requested: string[][]; refused?: boolean };

const captureEme = () => {
  const captured: Negotiation[] = [];

  (window as unknown as { __eme: Negotiation[] }).__eme = captured;

  const request = navigator.requestMediaKeySystemAccess.bind(navigator);

  navigator.requestMediaKeySystemAccess = async (keySystem, configurations) => {
    const requested = [...configurations].map((configuration) =>
      [...(configuration.videoCapabilities ?? []), ...(configuration.audioCapabilities ?? [])].map(
        (capability) => capability.robustness ?? ''
      )
    );

    try {
      const access = await request(keySystem, configurations);

      captured.push({ keySystem, requested });

      return access;
    } catch (error) {
      captured.push({ keySystem, requested, refused: true });
      throw error;
    }
  };
};

test.skip(
  !CDM_PATH,
  'Needs the Widevine CDM from a local Google Chrome install; see suites/drm/fixtures/drm-context.ts.'
);

/**
 * Chromium warns "It is recommended that a robustness level be specified" for any configuration in the _requested_ list
 * that omits `robustness` — not only the one it accepts. Three separate fixes read the accepted configuration instead
 * and each shipped believing the warning was gone, so the assertions here are on what was asked for.
 *
 * The trigger needs a key system Chromium can actually evaluate. One it holds no CDM for is refused before capabilities
 * are considered, which is why the FairPlay- and PlayReady-scoped cases stay silent even though those modules declare
 * no ladder and so ask unstamped.
 *
 * The negotiation happens once, during load, so the wrapper has to be installed before any page script runs. That is
 * the whole reason this is an init script rather than something the test evaluates after `goto`.
 */
for (const { id, negotiates, note } of SOURCES) {
  test(`${id} negotiates without an unstamped configuration — ${note}`, async ({ drmContext }) => {
    const page = await drmContext.newPage();

    await page.addInitScript(captureEme);

    const warnings: string[] = [];

    page.on('console', (message) => {
      if (/robustness/i.test(message.text())) warnings.push(message.text());
    });

    const query = new URLSearchParams({ source: id, preload: 'auto', autoplay: '0', muted: '1' });

    await page.goto(`${SANDBOX_BASE}/html-hls-video/?${query}`, { waitUntil: 'load' });

    if (negotiates) {
      // Also proves the page loaded *this* source rather than falling back to the
      // default, which carries no DRM and would negotiate nothing.
      await page.waitForFunction(() => (window as unknown as { __eme: unknown[] }).__eme.length > 0, undefined, {
        timeout: 30_000,
      });
    } else {
      await page.waitForTimeout(8_000);
    }

    const negotiations = await page.evaluate(() => (window as unknown as { __eme: Negotiation[] }).__eme);

    expect(negotiations.length > 0, `expected ${negotiates ? 'a' : 'no'} negotiation`).toBe(negotiates);

    for (const negotiation of negotiations.filter((entry) => LADDERED_KEY_SYSTEMS.has(entry.keySystem))) {
      for (const configuration of negotiation.requested) {
        for (const robustness of configuration) {
          expect(robustness, `${negotiation.keySystem} offered an unstamped capability`).not.toBe('');
        }
      }
    }

    expect(warnings, 'Chromium warned about robustness').toEqual([]);
  });
}
