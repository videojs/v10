import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isPlainObject } from '@videojs/utils/predicate';
import { type RegistryItem, registryItemSchema } from 'shadcn/schema';
import { describe, expect, it } from 'vitest';

const packageDir = resolve(import.meta.dirname, '../../..');
const registryDir = resolve(packageDir, 'dist/registry/source/r/react');

describe('React registry output', () => {
  const items = readRegistryItems();

  it('keeps the Video Skin installation notes concise', () => {
    const docs = [...itemClosure(items, 'video')].map((name) => items.get(name)?.docs ?? '').join('\n');

    expect(docs.length).toBeLessThanOrEqual(3_500);
    expect(docs.split('\n').length).toBeLessThanOrEqual(60);
  });

  it('marks every public module root as a client entry', () => {
    const missing = [...items.values()]
      .filter((item) => item.meta?.public)
      .filter((item) => !readItemRoot(item).includes("'use client';"))
      .map((item) => item.name);

    expect(missing).toEqual([]);
  });

  it('keeps project utilities and skin-owned modules in their intended boundaries', () => {
    const helper = items.get('_resolve-class-name');
    const playButton = readItemRoot(items.get('play-button')!);
    const defaultSkin = readItemRoot(items.get('video')!);
    const minimalSkin = readItemRoot(items.get('video-minimal')!);
    const defaultTargets = items.get('video')?.files?.map((file) => file.target) ?? [];
    const minimalTargets = items.get('video-minimal')?.files?.map((file) => file.target) ?? [];

    expect(helper?.files?.map((file) => file.target)).toEqual(['@lib/resolve-class-name.ts']);
    expect(playButton).toContain(`import { resolveClassName } from '@/lib/resolve-class-name';`);
    expect(playButton).toContain(`import { cn } from '@/lib/utils';`);
    expect(playButton).not.toContain(`{ cn, resolveClassName }`);
    expect(playButton).toContain(`import '../styles/base.css';`);
    expect(defaultSkin).toContain(`import '../../../styles/video/base.css';`);
    expect(minimalSkin).toContain(`import '../../../styles/video/minimal.css';`);
    expect(defaultTargets).toContain('@components/videojs/skins/video/default/skin.tsx');
    expect(defaultTargets).toContain('@components/videojs/skins/video/default/behaviors/hotkeys.tsx');
    expect(defaultTargets).toContain('@components/videojs/skins/video/default/display/status-indicators.tsx');
    expect(defaultTargets).toContain('@components/videojs/skins/video/default/layout/controls.tsx');
    expect(defaultTargets).toContain('@components/videojs/skins/video/default/menus/settings-menu.tsx');
    expect(minimalTargets).toContain('@components/videojs/skins/video/minimal/components/sliders/slider.tsx');
    expect(minimalTargets).toContain('@components/videojs/skins/video/minimal/components/display/status-indicator.tsx');
    expect(minimalTargets).toContain('@components/videojs/skins/video/minimal/components/dialogs/error-dialog.tsx');
    expect(minimalTargets).toContain('@components/videojs/skins/video/minimal/components/menus/volume-popover.tsx');
    expect(
      [...defaultTargets, ...minimalTargets].some((target) => target?.includes('/components/feedback/') === true)
    ).toBe(false);
    expect(
      [...defaultTargets, ...minimalTargets].some((target) => target?.includes('/components/controls/') === true)
    ).toBe(false);
    expect(styleTargets(items, 'video')).toEqual([
      '@components/videojs/styles/base.css',
      '@components/videojs/styles/themes/preferences.css',
      '@components/videojs/styles/themes/theme.css',
      '@components/videojs/styles/video/base.css',
      '@components/videojs/styles/video/captions.css',
      '@components/videojs/styles/video/theme.css',
    ]);
    expect(styleTargets(items, 'video-minimal')).toEqual([
      '@components/videojs/styles/base.css',
      '@components/videojs/styles/themes/minimal.css',
      '@components/videojs/styles/themes/preferences.css',
      '@components/videojs/styles/themes/theme.css',
      '@components/videojs/styles/video/base.css',
      '@components/videojs/styles/video/captions.css',
      '@components/videojs/styles/video/minimal.css',
      '@components/videojs/styles/video/theme.css',
    ]);
    expect(styleTargets(items, 'audio')).toEqual([
      '@components/videojs/styles/audio/base.css',
      '@components/videojs/styles/audio/theme.css',
      '@components/videojs/styles/base.css',
      '@components/videojs/styles/themes/preferences.css',
      '@components/videojs/styles/themes/theme.css',
    ]);
    expect(styleTargets(items, 'audio-minimal')).toEqual([
      '@components/videojs/styles/audio/base.css',
      '@components/videojs/styles/audio/minimal.css',
      '@components/videojs/styles/audio/theme.css',
      '@components/videojs/styles/base.css',
      '@components/videojs/styles/themes/minimal.css',
      '@components/videojs/styles/themes/preferences.css',
      '@components/videojs/styles/themes/theme.css',
    ]);
  });

  it('publishes component categories that match the UI taxonomy', () => {
    expect(items.get('buffering-indicator')?.categories).toEqual(['media', 'display']);
    expect(items.get('error-dialog')?.categories).toEqual(['media', 'dialogs']);
    expect(items.get('poster')?.categories).toEqual(['media', 'display']);
    expect(items.get('status-announcer')?.categories).toEqual(['media', 'behaviors']);
    expect(items.get('volume-popover')?.categories).toEqual(['media', 'menus']);
    expect(items.get('container')?.categories).toEqual(['media', 'layout']);
  });

  it('preserves utility groups as readable generated class-name arguments', () => {
    const files = readdirSync(registryDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
      .map((entry) => resolve(entry.parentPath, entry.name));
    const longest = Math.max(
      ...files.flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line) => line.length)
      )
    );

    expect(longest).toBeLessThanOrEqual(300);
    expect(readItemRoot(items.get('slider')!)).toContain("'group-data-dragging/slider:scale-90',");
    expect(readItemRoot(items.get('captions-menu')!)).toContain(
      "'not-data-submenu:data-[child-open]:-translate-x-full',"
    );
  });
});

function readRegistryItems(): ReadonlyMap<string, RegistryItem> {
  const items = new Map<string, RegistryItem>();

  for (const group of ['skins', 'ui', 'support']) {
    const registry: unknown = JSON.parse(readFileSync(resolve(registryDir, group, 'registry.json'), 'utf8'));
    if (!isPlainObject(registry) || !Array.isArray(registry.items)) throw new Error(`Invalid ${group} registry.`);

    for (const item of registry.items) {
      const parsed = registryItemSchema.parse(item);

      items.set(parsed.name, parsed);
    }
  }

  return items;
}

function itemClosure(items: ReadonlyMap<string, RegistryItem>, root: string): ReadonlySet<string> {
  const names = new Set<string>();
  const pending = [root];

  while (pending.length > 0) {
    const name = pending.pop();
    if (!name || names.has(name)) continue;

    const item = items.get(name);
    if (!item) throw new Error(`Missing registry dependency ${name}.`);

    names.add(name);

    for (const dependency of item.registryDependencies ?? []) {
      const match = /^@videojs\/(.+)$/.exec(dependency);

      if (match?.[1]) pending.push(match[1]);
    }
  }

  return names;
}

function styleTargets(items: ReadonlyMap<string, RegistryItem>, root: string): string[] {
  const targets = new Set<string>();

  for (const name of itemClosure(items, root)) {
    for (const file of items.get(name)?.files ?? []) {
      if (file.target?.includes('/styles/') && file.target.endsWith('.css')) targets.add(file.target);
    }
  }

  return [...targets].sort();
}

function readItemRoot(item: RegistryItem): string {
  const prefix = `files/${item.name}/`;
  const file = item.files?.find(
    (candidate) =>
      candidate.path?.startsWith(prefix) &&
      (candidate.path.endsWith('/skin.tsx') || candidate.path.endsWith(`/${item.name}.tsx`))
  );
  if (!file?.path) throw new Error(`Registry item ${item.name} has no root file.`);

  for (const group of ['skins', 'ui', 'support']) {
    const path = resolve(registryDir, group, file.path);

    try {
      return readFileSync(path, 'utf8');
    } catch {
      continue;
    }
  }

  throw new Error(`Could not read the root file for registry item ${item.name}.`);
}
