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
