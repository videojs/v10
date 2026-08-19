import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineComponent, defineSchema } from '../../../components/definition';
import { generateEntries, parseGenerateEntriesConfig } from '../entries';

describe('generateEntries', () => {
  it('emits deterministic nested entries from a component schema', () => {
    const dir = mkdtempSync(join(tmpdir(), 'videojs-entries-'));
    const output = join(dir, 'entries.ts');
    const schema = defineSchema('@fixture/components', {
      PlayButton: defineComponent({ name: 'PlayButton' }),
      Tooltip: defineComponent({
        name: 'Tooltip',
        root: 'Root',
        parts: {
          Root: defineComponent(),
          Popup: defineComponent(),
        },
      }),
    });
    const config = {
      schema,
      output,
      resolve: ({ component, part }: { component: string; part: string | null }) => ({
        import: {
          from: '@fixture/react',
          name: component,
          ...(part ? { path: part.split('.') } : {}),
        },
      }),
    };

    const first = generateEntries(config);
    const second = generateEntries(config);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(output, 'utf8')).toBe(first.code);
    expect(first.code).not.toContain("from 'vjsc/components'");
    expect(first.code).not.toContain('defineElement');
    expect(first.code).toContain('export const PlayButton = {');
    expect(first.code).toContain("name: 'Tooltip',");
    expect(first.code).toContain("path: ['Popup'],");
    expect(first.code.indexOf('Popup:')).toBeLessThan(first.code.indexOf('Root:'));
  });

  it('resolves and prioritizes entries from source files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'videojs-entries-'));
    const output = join(dir, 'entries.ts');
    writeFileSync(join(dir, 'element.ts'), `export class TargetElement { static tagName = 'media-target'; }`);
    writeFileSync(join(dir, 'fallback.ts'), 'export const target = "fallback";');
    writeFileSync(join(dir, 'preferred.ts'), `import { TargetElement } from './element';\nTargetElement;`);

    let resolvedTagName = '';

    const result = generateEntries(
      {
        files: '*.ts',
        output,
        resolve: ({ fileName, resolveModule }) => {
          const preferred = fileName.endsWith('preferred.ts');

          if (preferred) {
            resolvedTagName = resolveModule('./element')?.sourceFile.text ?? '';
          }

          return [
            {
              name: 'Target',
              priority: preferred ? 1 : 0,
              entry: {
                tagName: 'media-target',
                import: { from: `./${fileName.split('/').at(-1)}`, sideEffect: true },
              },
            },
          ];
        },
      },
      { cwd: dir }
    );

    expect(resolvedTagName).toContain("static tagName = 'media-target'");
    expect(result.code).toContain("from: './preferred.ts'");
    expect(result.code).not.toContain("from: './fallback.ts'");
    expect(result.code).not.toContain("from 'vjsc/components'");
    expect(result.code).toContain("tagName: 'media-target',");
    expect(result.code).not.toContain('defineTarget');
    expect(result.code).toContain('export const entries = {');
  });

  it('validates loaded config values', () => {
    expect(() => parseGenerateEntriesConfig({ files: [], output: '', resolve: () => [] }, 'fixture')).toThrow(
      'Invalid registry entries generator config fixture'
    );
  });
});
