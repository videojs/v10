import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getUtilEntries, type UtilEntry } from '../util-handler';

const FIXTURE_ROOT = path.resolve(import.meta.dirname, 'fixtures/monorepo');

describe('getUtilEntries', () => {
  const entries = getUtilEntries(FIXTURE_ROOT);

  function findByName(name: string, framework?: 'react' | 'html' | null): UtilEntry | undefined {
    return entries.find((e) => e.data.name === name && (framework === undefined || e.framework === framework));
  }

  it('discovers hooks', () => {
    expect(findByName('usePlayer', 'react')).toBeDefined();
    expect(findByName('useStore', 'react')).toBeDefined();
  });

  it('discovers controllers', () => {
    expect(findByName('PlayerController', 'html')).toBeDefined();
    expect(findByName('SnapshotController', 'html')).toBeDefined();
  });

  it('discovers mixin with stripped display name', () => {
    const mixin = findByName('ContainerMixin', 'html');
    expect(mixin).toBeDefined();
    expect(mixin!.slug).toBe('container-mixin');
  });

  it('discovers factories including createSelector', () => {
    const reactCreate = findByName('createPlayer', 'react');
    const htmlCreate = findByName('createPlayer', 'html');
    const createSelector = findByName('createSelector', null);

    expect(reactCreate).toBeDefined();
    expect(htmlCreate).toBeDefined();
    expect(createSelector).toBeDefined();
  });

  it('discovers @public utility and context', () => {
    expect(findByName('mergeProps', 'react')).toBeDefined();
    expect(findByName('playerContext', 'html')).toBeDefined();
  });

  it('discovers selectors as framework-agnostic', () => {
    const selectorNames = ['selectPlayback', 'selectVolume', 'selectTime'];
    for (const name of selectorNames) {
      const entry = findByName(name, null);
      expect(entry, `expected to find ${name}`).toBeDefined();
      expect(entry!.framework).toBeNull();
    }
  });

  it('assigns correct frameworks', () => {
    // React
    expect(findByName('usePlayer')!.framework).toBe('react');
    expect(findByName('useStore')!.framework).toBe('react');
    expect(findByName('mergeProps')!.framework).toBe('react');

    // HTML
    expect(findByName('PlayerController')!.framework).toBe('html');
    expect(findByName('SnapshotController')!.framework).toBe('html');
    expect(findByName('playerContext')!.framework).toBe('html');

    // Framework-agnostic
    expect(findByName('selectPlayback')!.framework).toBeNull();
    expect(findByName('createSelector')!.framework).toBeNull();
  });

  it('handles slug collision', () => {
    const reactCreate = entries.find((e) => e.slug === 'create-player');
    const htmlCreate = entries.find((e) => e.slug === 'html-create-player');

    expect(reactCreate).toBeDefined();
    expect(reactCreate!.framework).toBe('react');
    expect(htmlCreate).toBeDefined();
    expect(htmlCreate!.framework).toBe('html');
  });

  it('extracts multi-overload signatures', () => {
    const usePlayer = findByName('usePlayer', 'react');
    expect(usePlayer!.data.overloads.length).toBeGreaterThanOrEqual(2);

    const useStore = findByName('useStore', 'react');
    expect(useStore!.data.overloads.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts JSDoc descriptions', () => {
    const usePlayer = findByName('usePlayer', 'react');
    expect(usePlayer!.data.description).toBeDefined();

    const playerController = findByName('PlayerController', 'html');
    expect(playerController!.data.description).toBeDefined();

    const playerContext = findByName('playerContext', 'html');
    expect(playerContext!.data.description).toBeDefined();
  });
});
