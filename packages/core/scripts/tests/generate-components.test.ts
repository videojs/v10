import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { generateComponents } from '../generate-components';

const STUB = 'const defineComponent: any = () => (m: any) => m; const defineComponentPart: any = () => ({});';

function setup(): { dir: string; output: string; pattern: string } {
  const dir = mkdtempSync(join(tmpdir(), 'videojs-components-'));
  mkdirSync(join(dir, 'play-button'));
  mkdirSync(join(dir, 'slider'));
  mkdirSync(join(dir, 'hotkey'));

  writeFileSync(
    join(dir, 'play-button', 'play-button-data-attrs.ts'),
    `export const PlayButtonDataAttrs = {} as const;`
  );
  writeFileSync(
    join(dir, 'play-button', 'play-button-component.ts'),
    `import { PlayButtonDataAttrs } from './play-button-data-attrs';
     ${STUB}
     export default defineComponent<{ disabled?: boolean }>()({
       name: 'PlayButton',
       dataAttrs: PlayButtonDataAttrs,
     });`
  );

  writeFileSync(join(dir, 'slider', 'slider-data-attrs.ts'), `export const SliderDataAttrs = {} as const;`);
  writeFileSync(
    join(dir, 'slider', 'slider-component.ts'),
    `import { SliderDataAttrs } from './slider-data-attrs';
     ${STUB}
     export default defineComponent()({
       name: 'Slider',
       parts: {
         Root: defineComponentPart<{ orientation?: 'horizontal' | 'vertical' }>(),
         Track: defineComponentPart(),
       },
       dataAttrs: SliderDataAttrs,
     });`
  );

  writeFileSync(
    join(dir, 'hotkey', 'hotkey-component.ts'),
    `${STUB}
     export default defineComponent()({ name: 'Hotkey' });`
  );

  return { dir, output: join(dir, 'out.ts'), pattern: join(dir, '*/*-component.ts') };
}

function setupBulk(): { dir: string; output: string } {
  const dir = mkdtempSync(join(tmpdir(), 'videojs-components-bulk-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets', 'play.svg'), '<svg/>');
  writeFileSync(join(dir, 'assets', 'pause.svg'), '<svg/>');
  return { dir, output: join(dir, 'out.ts') };
}

describe('generateComponents (manifest entries)', () => {
  it('imports each manifest as `<Name>Def` default-import', async () => {
    const { dir, output, pattern } = setup();
    await generateComponents({ components: [pattern], output }, { cwd: dir });
    const source = readFileSync(output, 'utf8');
    expect(source).toContain("import { createComponent } from '@videojs/core/jsx-runtime';");
    expect(source).toContain("import PlayButtonDef from './play-button/play-button-component';");
    expect(source).toContain("import SliderDef from './slider/slider-component';");
    expect(source).toContain("import HotkeyDef from './hotkey/hotkey-component';");
  });

  it('uses an explicit runtime import when configured', async () => {
    const { dir, output, pattern } = setup();
    await generateComponents({ components: [pattern], output, runtimeImport: '../../jsx-runtime' }, { cwd: dir });
    const source = readFileSync(output, 'utf8');
    expect(source).toContain("import { createComponent } from '../../jsx-runtime';");
  });

  it('emits createComponent(Def) for each component', async () => {
    const { dir, output, pattern } = setup();
    await generateComponents({ components: [pattern], output }, { cwd: dir });
    const source = readFileSync(output, 'utf8');
    expect(source).toContain('export const PlayButton = createComponent(PlayButtonDef);');
    expect(source).toContain('export const Slider = createComponent(SliderDef);');
    expect(source).toContain('export const Hotkey = createComponent(HotkeyDef);');
  });

  it('emits COMPONENTS referencing each definition', async () => {
    const { dir, output, pattern } = setup();
    await generateComponents({ components: [pattern], output }, { cwd: dir });
    const source = readFileSync(output, 'utf8');
    expect(source).toContain('export const COMPONENTS = {');
    expect(source).toContain('export type Components = typeof COMPONENTS;');
    expect(source).toContain('PlayButton: PlayButtonDef,');
    expect(source).toContain('Slider: SliderDef,');
    expect(source).toContain('Hotkey: HotkeyDef,');
  });
});

describe('generateComponents (bulk entries)', () => {
  it('inlines createComponent({ name }) for each matched file', async () => {
    const { dir, output } = setupBulk();
    await generateComponents(
      {
        components: [
          {
            files: join(dir, 'assets/*.svg'),
            name: (filename) => `${filename[0]!.toUpperCase()}${filename.slice(1)}Icon`,
          },
        ],
        output,
      },
      { cwd: dir }
    );
    const source = readFileSync(output, 'utf8');
    expect(source).toContain("export const PauseIcon = createComponent({ name: 'PauseIcon' });");
    expect(source).toContain("export const PlayIcon = createComponent({ name: 'PlayIcon' });");
  });

  it('emits COMPONENTS with inline manifests for bulk entries', async () => {
    const { dir, output } = setupBulk();
    await generateComponents(
      {
        components: [
          {
            files: join(dir, 'assets/*.svg'),
            name: (filename) => `${filename[0]!.toUpperCase()}${filename.slice(1)}Icon`,
          },
        ],
        output,
      },
      { cwd: dir }
    );
    const source = readFileSync(output, 'utf8');
    expect(source).toContain("PlayIcon: { name: 'PlayIcon' },");
    expect(source).toContain("PauseIcon: { name: 'PauseIcon' },");
  });

  it('strips the file extension before passing to name()', async () => {
    const { dir, output } = setupBulk();
    let received: string | null = null;
    await generateComponents(
      {
        components: [
          {
            files: join(dir, 'assets/*.svg'),
            name: (filename) => {
              if (received === null) received = filename;
              return `${filename}Icon`;
            },
          },
        ],
        output,
      },
      { cwd: dir }
    );
    expect(received).not.toContain('.svg');
  });
});
