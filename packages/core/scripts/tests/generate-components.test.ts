import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { generateComponents, normalizeImportPath } from '../generate-components';

const STUB = 'const defineComponent: any = (manifest?: any) => manifest ?? {};';

function setup(): { dir: string; output: string; pattern: string } {
  const dir = mkdtempSync(join(tmpdir(), 'videojs-components-'));
  mkdirSync(join(dir, 'play-button'));
  mkdirSync(join(dir, 'slider'));

  writeFileSync(
    join(dir, 'play-button', 'play-button-component.ts'),
    `${STUB}
     export default defineComponent<{ disabled?: boolean }>({ name: 'PlayButton' });`
  );
  writeFileSync(
    join(dir, 'slider', 'slider-component.ts'),
    `${STUB}
     export default defineComponent({
       name: 'Slider',
       parts: { Root: defineComponent(), Track: defineComponent() },
     });`
  );

  return { dir, output: join(dir, 'out.ts'), pattern: join(dir, '*/*-component.ts') };
}

describe('generateComponents', () => {
  it('normalizes generated import paths for ESM', () => {
    expect(normalizeImportPath('controls\\play-button-component.ts')).toBe('./controls/play-button-component');
    expect(normalizeImportPath('..\\shared\\text-component.tsx')).toBe('../shared/text-component');
  });

  it('emits deterministic component exports and metadata from manifests', async () => {
    const { dir, output, pattern } = setup();
    const first = await generateComponents({ components: [pattern], output }, { cwd: dir });
    const second = await generateComponents({ components: [pattern], output }, { cwd: dir });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(output, 'utf8')).toBe(first.source);
    expect(first.source).toContain("import PlayButtonDef from './play-button/play-button-component';");
    expect(first.source).toContain("import SliderDef from './slider/slider-component';");
    expect(first.source).toContain('export const PlayButton = createComponent(PlayButtonDef);');
    expect(first.source).toContain('export const Slider = createComponent(SliderDef);');
    expect(first.source).toContain('PlayButton: PlayButtonDef,');
    expect(first.source).toContain('Slider: SliderDef,');
  });

  it('uses an explicit runtime import when configured', async () => {
    const { dir, output, pattern } = setup();
    const result = await generateComponents(
      { components: [pattern], output, runtimeImport: '@videojs/jsx' },
      { cwd: dir }
    );

    expect(result.source).toContain("import { createComponent } from '@videojs/jsx';");
  });

  it('fails check mode when generated output is stale', async () => {
    const { dir, output, pattern } = setup();
    writeFileSync(output, '// stale\n');

    await expect(generateComponents({ components: [pattern], output }, { cwd: dir, check: true })).rejects.toThrow(
      'Generated components are stale'
    );
  });

  it('rejects duplicate component names', async () => {
    const { dir, output, pattern } = setup();
    mkdirSync(join(dir, 'duplicate'));
    writeFileSync(
      join(dir, 'duplicate', 'duplicate-component.ts'),
      `${STUB} export default defineComponent({ name: 'Slider' });`
    );

    await expect(generateComponents({ components: [pattern], output }, { cwd: dir })).rejects.toThrow(
      'Duplicate component name: Slider'
    );
  });

  it('supports bulk component entries', async () => {
    const { dir, output } = setup();
    mkdirSync(join(dir, 'icons'));
    writeFileSync(join(dir, 'icons', 'play.svg'), '<svg/>');
    writeFileSync(join(dir, 'icons', 'pause.svg'), '<svg/>');

    const result = await generateComponents(
      {
        components: [
          {
            files: join(dir, 'icons/*.svg'),
            name: (filename) => `${filename[0]!.toUpperCase()}${filename.slice(1)}Icon`,
          },
        ],
        output,
      },
      { cwd: dir }
    );

    expect(result.source).toContain("export const PauseIcon = createComponent({ name: 'PauseIcon' });");
    expect(result.source).toContain("export const PlayIcon = createComponent({ name: 'PlayIcon' });");
  });
});
