/**
 * Type-level guard on the `drm` / `keySystems` relationship: `drm` may only name ids the composed modules claim.
 *
 * This replaced a dev-only runtime warning. An entry for a system no composed module claims can never be negotiated —
 * `keySystemCandidates` intersects the two — and nothing at runtime notices; the source just refuses as if unlicensed.
 * Carrying each shipped module's id as a literal type lets the engine config say so before the code runs.
 */
import { describe, it } from 'vite-plus/test';

import { clearKeySystem, widevineKeySystem } from '../../../../media/dom/key-systems';
import type { DrmSystemsConfig, KeySystemModule } from '../../../../media/drm';
import { createHlsVideoEngine } from '../engine';

const server = { licenseUrl: 'https://license.example.com' };

describe('HlsVideoEngineConfig drm keys', () => {
  it('are the default systems when keySystems is omitted', () => {
    createHlsVideoEngine({ drm: { 'com.widevine.alpha': server, 'com.apple.fps': server } });
    // @ts-expect-error — a typo no composed module claims
    createHlsVideoEngine({ drm: { 'com.widevine.alpa': server } });
    // @ts-expect-error — a real system, but not a default one
    createHlsVideoEngine({ drm: { 'org.w3.clearkey': server } });
  });

  it('follow a narrowed keySystems tuple', () => {
    createHlsVideoEngine({ keySystems: [clearKeySystem], drm: { 'org.w3.clearkey': server } });
    createHlsVideoEngine({ keySystems: [widevineKeySystem, clearKeySystem], drm: { 'com.widevine.alpha': server } });
    // @ts-expect-error — composed only Clear Key, so Widevine can never be negotiated
    createHlsVideoEngine({ keySystems: [clearKeySystem], drm: { 'com.widevine.alpha': server } });
  });

  it('widen to any id when the modules are not literally typed', () => {
    const custom: KeySystemModule = { ...clearKeySystem, keySystem: 'com.example.custom' };
    const systems: readonly KeySystemModule[] = [custom];

    createHlsVideoEngine({ keySystems: systems, drm: { 'com.example.custom': server } });
  });

  it('accept the runtime source-shaped config, which is keyed by any id', () => {
    const fromSource: DrmSystemsConfig = {};

    createHlsVideoEngine({ drm: fromSource });
  });
});
