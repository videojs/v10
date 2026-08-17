import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineComponent, defineComponents } from '../../definition';
import { generateTarget, parseGenerateTargetConfig } from '../target';

describe('generateTarget', () => {
  it('emits deterministic nested targets from component definitions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'videojs-target-'));
    const output = join(dir, 'target.ts');
    const components = defineComponents('@fixture/components', {
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
      components,
      output,
      resolve: ({ component, part }: { component: string; part: string | null }) => ({
        import: {
          from: '@fixture/react',
          name: component,
          ...(part ? { path: part.split('.') } : {}),
        },
      }),
    };

    const first = generateTarget(config);
    const second = generateTarget(config);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(output, 'utf8')).toBe(first.code);
    expect(first.code).toContain('export const PlayButton = defineTarget({');
    expect(first.code).toContain("name: 'Tooltip',");
    expect(first.code).toContain("path: ['Popup'],");
    expect(first.code.indexOf('Popup:')).toBeLessThan(first.code.indexOf('Root:'));
  });

  it('resolves and prioritizes targets from source files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'videojs-target-'));
    const output = join(dir, 'target.ts');
    writeFileSync(join(dir, 'element.ts'), `export class TargetElement { static tagName = 'media-target'; }`);
    writeFileSync(join(dir, 'fallback.ts'), 'export const target = "fallback";');
    writeFileSync(join(dir, 'preferred.ts'), `import { TargetElement } from './element';\nTargetElement;`);

    let resolvedTagName = '';

    const result = generateTarget(
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
              target: {
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
    expect(result.code).toContain('export const targets = {');
  });

  it('validates loaded config values', () => {
    expect(() => parseGenerateTargetConfig({ files: [], output: '', resolve: () => [] }, 'fixture')).toThrow(
      'Invalid component target generator config fixture'
    );
  });
});
