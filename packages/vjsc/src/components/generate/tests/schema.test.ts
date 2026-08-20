import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createSchemaModule } from '../schema';

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

describe('createSchemaModule', () => {
  it('produces schema source and watch files without writing output', () => {
    const { dir, output, pattern } = setup();
    const generated = createSchemaModule({ source: '@fixture/components', include: [pattern], output }, { cwd: dir });

    expect(generated.code).toContain('export const PlayButton');
    expect(generated.schema).toMatchObject({
      source: '@fixture/components',
      definitions: {
        PlayButton: { name: 'PlayButton' },
        Slider: {
          name: 'Slider',
          parts: { Root: {}, Track: {} },
        },
      },
    });
    expect(generated.watchFiles).toEqual([
      join(dir, 'play-button', 'play-button-component.ts'),
      join(dir, 'slider', 'slider-component.ts'),
    ]);
    expect(existsSync(output)).toBe(false);
  });

  it('emits deterministic component exports and metadata from manifests', () => {
    const { dir, output, pattern } = setup();
    const config = { source: '@fixture/components', include: [pattern], output };
    const module = createSchemaModule(config, { cwd: dir });

    expect(module.code).toContain("import PlayButtonDef from './play-button/play-button-component';");
    expect(module.code).toContain("import SliderDef from './slider/slider-component';");
    expect(module.code).toContain('export const PlayButton = createComponent(PlayButtonDef);');
    expect(module.code).toContain('export const Slider = createComponent(SliderDef);');
    expect(module.code).toContain('PlayButton: PlayButtonDef,');
    expect(module.code).toContain('Slider: SliderDef,');
    expect(module.code).toContain("export default defineSchema('@fixture/components', DEFINITIONS);");
  });

  it('rejects duplicate component names', () => {
    const { dir, output, pattern } = setup();
    mkdirSync(join(dir, 'duplicate'));
    writeFileSync(
      join(dir, 'duplicate', 'duplicate-component.ts'),
      `${STUB} export default defineComponent({ name: 'Slider' });`
    );

    expect(() =>
      createSchemaModule({ source: '@fixture/components', include: [pattern], output }, { cwd: dir })
    ).toThrow('Duplicate component name: Slider');
  });

  it('supports generated components derived from non-manifest files', () => {
    const { dir, output } = setup();
    mkdirSync(join(dir, 'icons'));
    writeFileSync(join(dir, 'icons', 'play.svg'), '<svg/>');
    writeFileSync(join(dir, 'icons', 'pause.svg'), '<svg/>');

    const result = createSchemaModule(
      {
        source: '@fixture/icons',
        include: [
          {
            include: join(dir, 'icons/*.svg'),
            name: (filename) => `${filename[0]!.toUpperCase()}${filename.slice(1)}Icon`,
          },
        ],
        output,
      },
      { cwd: dir }
    );

    expect(result.code).toContain("export const PauseIcon = createComponent({ name: 'PauseIcon' });");
    expect(result.code).toContain("export const PlayIcon = createComponent({ name: 'PlayIcon' });");
  });
});
