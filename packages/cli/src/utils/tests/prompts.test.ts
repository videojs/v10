import { describe, expect, it } from 'vitest';
import { supportsCdnInstall } from '../prompts.js';

// Wires the cdn-media manifest into the CLI the same way the install page reads
// the cdnMedia collection. Every current renderer ships (or is covered by) a
// CDN build, so all resolve true; the no-CDN path (e.g. Vimeo) arrives with the
// new rendering engines. `rendererSupportsCdn`'s false branch is unit-tested in
// cdn-code.test.ts.
describe('supportsCdnInstall', () => {
  it('returns true for preset renderers (covered by the preset bundle)', () => {
    expect(supportsCdnInstall('html5-video')).toBe(true);
    expect(supportsCdnInstall('html5-audio')).toBe(true);
    expect(supportsCdnInstall('background-video')).toBe(true);
  });

  it('returns true for hls, whose media bundle ships a CDN build', () => {
    expect(supportsCdnInstall('hls')).toBe(true);
  });
});
