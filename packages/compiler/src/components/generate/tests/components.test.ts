import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateComponents, parseGenerateComponentsConfig } from '../components';

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
  it('emits deterministic component exports and metadata from manifests', () => {
    const { dir, output, pattern } = setup();
    const config = { source: '@fixture/components', components: [pattern], output };
    const first = generateComponents(config, { cwd: dir });
    const second = generateComponents(config, { cwd: dir });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(output, 'utf8')).toBe(first.code);
    expect(first.code).toContain("import PlayButtonDef from './play-button/play-button-component';");
    expect(first.code).toContain("import SliderDef from './slider/slider-component';");
    expect(first.code).toContain('export const PlayButton = createComponent(PlayButtonDef);');
    expect(first.code).toContain('export const Slider = createComponent(SliderDef);');
    expect(first.code).toContain('PlayButton: PlayButtonDef,');
    expect(first.code).toContain('Slider: SliderDef,');
    expect(first.code).toContain("export const components = defineComponents('@fixture/components', COMPONENTS);");
  });

  it('fails check mode when generated output is stale', () => {
    const { dir, output, pattern } = setup();
    writeFileSync(output, '// stale\n');

    expect(() =>
      generateComponents({ source: '@fixture/components', components: [pattern], output }, { cwd: dir, check: true })
    ).toThrow('Generated file is stale');
  });

  it('rejects duplicate component names', () => {
    const { dir, output, pattern } = setup();
    mkdirSync(join(dir, 'duplicate'));
    writeFileSync(
      join(dir, 'duplicate', 'duplicate-component.ts'),
      `${STUB} export default defineComponent({ name: 'Slider' });`
    );

    expect(() =>
      generateComponents({ source: '@fixture/components', components: [pattern], output }, { cwd: dir })
    ).toThrow('Duplicate component name: Slider');
  });

  it('supports generated components derived from non-manifest files', () => {
    const { dir, output } = setup();
    mkdirSync(join(dir, 'icons'));
    writeFileSync(join(dir, 'icons', 'play.svg'), '<svg/>');
    writeFileSync(join(dir, 'icons', 'pause.svg'), '<svg/>');

    const result = generateComponents(
      {
        source: '@fixture/icons',
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

    expect(result.code).toContain("export const PauseIcon = createComponent({ name: 'PauseIcon' });");
    expect(result.code).toContain("export const PlayIcon = createComponent({ name: 'PlayIcon' });");
  });

  it('validates loaded config values', () => {
    expect(() => parseGenerateComponentsConfig({ source: '', components: [], output: '' }, 'fixture')).toThrow(
      'Invalid component generator config fixture'
    );
  });
});
