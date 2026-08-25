import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { createSchemaModule } from '../generate';

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
    const generated = createSchemaModule({ cwd: dir, source: '@fixture/components', include: [pattern], output });

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
    const config = { cwd: dir, source: '@fixture/components', include: [pattern], output };
    const module = createSchemaModule(config);

    expect(module.code).toContain("import PlayButtonDef from './play-button/play-button-component';");
    expect(module.code).toContain("import SliderDef from './slider/slider-component';");
    expect(module.code).toContain("export const PlayButton: CreateComponentResult<(typeof DEFINITIONS)['PlayButton']>");
    expect(module.code).toContain("export const Slider: CreateComponentResult<(typeof DEFINITIONS)['Slider']>");
    expect(module.code).toContain('PlayButton: PlayButtonDef,');
    expect(module.code).toContain('Slider: SliderDef,');
    expect(module.code).toContain('defineSchema("@fixture/components", DEFINITIONS)');
  });

  it('excludes matching component sources', () => {
    const { dir, output, pattern } = setup();
    const generated = createSchemaModule({
      cwd: dir,
      source: '@fixture/components',
      include: [pattern],
      exclude: [join(dir, 'slider/**')],
      output,
    });

    expect(generated.code).toContain('PlayButton');
    expect(generated.code).not.toContain('Slider');
  });

  it('rejects duplicate component names', () => {
    const { dir, output, pattern } = setup();

    mkdirSync(join(dir, 'duplicate'));
    writeFileSync(
      join(dir, 'duplicate', 'duplicate-component.ts'),
      `${STUB} export default defineComponent({ name: 'Slider' });`
    );

    expect(() => createSchemaModule({ cwd: dir, source: '@fixture/components', include: [pattern], output })).toThrow(
      'Duplicate component name: Slider'
    );
  });

  it('supports generated components derived from non-manifest files', () => {
    const { dir, output } = setup();

    mkdirSync(join(dir, 'icons'));
    writeFileSync(join(dir, 'icons', 'play.svg'), '<svg/>');
    writeFileSync(join(dir, 'icons', 'pause.svg'), '<svg/>');

    const result = createSchemaModule({
      cwd: dir,
      source: '@fixture/icons',
      include: [
        {
          include: join(dir, 'icons/*.svg'),
          name: (filename) => `${filename[0]!.toUpperCase()}${filename.slice(1)}Icon`,
        },
      ],
      output,
    });

    expect(result.code).toContain('createComponent(DEFINITIONS.PauseIcon)');
    expect(result.code).toContain('createComponent(DEFINITIONS.PlayIcon)');
  });
});
