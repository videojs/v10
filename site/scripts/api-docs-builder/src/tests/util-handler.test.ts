import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getUtilEntries, type UtilEntry } from '../util-handler';

const MONOREPO_ROOT = path.resolve(import.meta.dirname, '../../../../../');

describe('getUtilEntries', () => {
  const entries = getUtilEntries(MONOREPO_ROOT);

  function findByName(name: string, framework?: 'react' | 'html' | null): UtilEntry | undefined {
    return entries.find((e) => e.data.name === name && (framework === undefined || e.framework === framework));
  }

  it('discovers all expected hooks', () => {
    const hooks = entries.filter((e) => e.data.kind === 'hook');
    const hookNames = hooks.map((h) => h.data.name);

    expect(hookNames).toContain('usePlayer');
    expect(hookNames).toContain('useMedia');
    expect(hookNames).toContain('useMediaRegistration');
    expect(hookNames).toContain('usePlayerContext');
    expect(hookNames).toContain('useStore');
    expect(hookNames).toContain('useSelector');
    expect(hookNames).toContain('useSnapshot');
    expect(hookNames).toContain('useButton');
  });

  it('discovers all expected controllers', () => {
    const controllers = entries.filter((e) => e.data.kind === 'controller');
    const names = controllers.map((c) => c.data.name);

    expect(names).toContain('PlayerController');
    expect(names).toContain('StoreController');
    expect(names).toContain('SnapshotController');
    expect(names).toContain('SubscriptionController');
  });

  it('discovers all expected mixins', () => {
    const mixins = entries.filter((e) => e.data.kind === 'mixin');
    const names = mixins.map((m) => m.data.name);

    expect(names).toContain('ProviderMixin');
    expect(names).toContain('ContainerMixin');
    expect(names).toContain('PlayerMixin');
  });

  it('discovers both createPlayer factories', () => {
    const factories = entries.filter((e) => e.data.kind === 'factory' && e.data.name === 'createPlayer');
    expect(factories).toHaveLength(2);

    const frameworks = factories.map((f) => f.framework).sort();
    expect(frameworks).toEqual(['html', 'react']);
  });

  it('discovers renderElement and mergeProps as utilities', () => {
    const utilities = entries.filter((e) => e.data.kind === 'utility');
    const names = utilities.map((u) => u.data.name);

    expect(names).toContain('renderElement');
    expect(names).toContain('mergeProps');
  });

  it('discovers playerContext as context', () => {
    const contexts = entries.filter((e) => e.data.kind === 'context');
    const names = contexts.map((c) => c.data.name);

    expect(names).toContain('playerContext');
  });

  it('uses html-create-player slug for HTML createPlayer to avoid collision', () => {
    const reactCreate = entries.find((e) => e.slug === 'create-player');
    const htmlCreate = entries.find((e) => e.slug === 'html-create-player');

    expect(reactCreate).toBeDefined();
    expect(reactCreate!.framework).toBe('react');
    expect(htmlCreate).toBeDefined();
    expect(htmlCreate!.framework).toBe('html');
  });

  it('generates valid slugs for all entries', () => {
    const slugs = entries.map((e) => e.slug);
    const uniqueSlugs = new Set(slugs);

    expect(uniqueSlugs.size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('ensures every entry has at least one overload', () => {
    for (const entry of entries) {
      expect(entry.data.overloads.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('marks multi-overload hooks with genuinely different signatures', () => {
    const usePlayer = findByName('usePlayer', 'react');
    expect(usePlayer!.data.overloads.length).toBeGreaterThanOrEqual(2);

    const useStore = findByName('useStore');
    expect(useStore!.data.overloads.length).toBeGreaterThanOrEqual(2);

    const useSnapshot = findByName('useSnapshot');
    expect(useSnapshot!.data.overloads.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts descriptions from JSDoc', () => {
    const usePlayer = findByName('usePlayer', 'react');
    expect(usePlayer!.data.description).toBeDefined();

    const playerController = findByName('PlayerController');
    expect(playerController!.data.description).toBeDefined();

    const playerContext = findByName('playerContext');
    expect(playerContext!.data.description).toBeDefined();
  });

  it('extracts controller constructor parameters', () => {
    const snapshotCtrl = findByName('SnapshotController');
    expect(snapshotCtrl).toBeDefined();

    // Should have 2 constructor overloads (with/without selector)
    expect(snapshotCtrl!.data.overloads).toHaveLength(2);

    const firstOverload = snapshotCtrl!.data.overloads[0]!;
    expect(firstOverload.parameters).toHaveProperty('host');
    expect(firstOverload.parameters).toHaveProperty('state');
    expect(firstOverload.parameters.host!.required).toBe(true);
  });

  it('extracts controller public members as return value fields', () => {
    const snapshotCtrl = findByName('SnapshotController');
    const firstOverload = snapshotCtrl!.data.overloads[0]!;

    expect(firstOverload.returnValue.fields).toBeDefined();
    expect(firstOverload.returnValue.fields).toHaveProperty('value');
    expect(firstOverload.returnValue.fields).toHaveProperty('track');
  });

  it('assigns correct frameworks', () => {
    // React utils
    expect(findByName('usePlayer', 'react')).toBeDefined();
    expect(findByName('useStore', 'react')).toBeDefined();
    expect(findByName('mergeProps', 'react')).toBeDefined();

    // HTML utils
    expect(findByName('PlayerController', 'html')).toBeDefined();
    expect(findByName('SnapshotController', 'html')).toBeDefined();
    expect(findByName('playerContext', 'html')).toBeDefined();

    // Framework-agnostic utils
    expect(findByName('selectPlayback', null)).toBeDefined();
    expect(findByName('createSelector', null)).toBeDefined();
  });

  it('discovers createSelector as a factory', () => {
    const entry = findByName('createSelector');
    expect(entry).toBeDefined();
    expect(entry!.data.kind).toBe('factory');
    expect(entry!.framework).toBeNull();
    expect(entry!.data.overloads.length).toBeGreaterThanOrEqual(1);
  });

  it('discovers all 8 selectors as framework-agnostic', () => {
    const selectors = entries.filter((e) => e.data.kind === 'selector');
    const names = selectors.map((s) => s.data.name);

    expect(selectors).toHaveLength(8);
    expect(names).toContain('selectBuffer');
    expect(names).toContain('selectControls');
    expect(names).toContain('selectFullscreen');
    expect(names).toContain('selectPiP');
    expect(names).toContain('selectPlayback');
    expect(names).toContain('selectSource');
    expect(names).toContain('selectTime');
    expect(names).toContain('selectVolume');

    for (const selector of selectors) {
      expect(selector.framework).toBeNull();
    }
  });

  it('generates correct slugs for selectors', () => {
    const selectors = entries.filter((e) => e.data.kind === 'selector');
    const slugs = selectors.map((s) => s.slug).sort();

    expect(slugs).toEqual([
      'select-buffer',
      'select-controls',
      'select-fullscreen',
      'select-pi-p',
      'select-playback',
      'select-source',
      'select-time',
      'select-volume',
    ]);
  });

  it('extracts selector overloads with state parameter', () => {
    const selectPlayback = findByName('selectPlayback');
    expect(selectPlayback).toBeDefined();
    expect(selectPlayback!.data.overloads.length).toBeGreaterThanOrEqual(1);

    const overload = selectPlayback!.data.overloads[0]!;
    expect(overload.parameters).toHaveProperty('state');
  });

  it('extracts JSDoc descriptions for selectors', () => {
    const selectPlayback = findByName('selectPlayback');
    expect(selectPlayback!.data.description).toBeDefined();

    const selectVolume = findByName('selectVolume');
    expect(selectVolume!.data.description).toBeDefined();
  });
});
