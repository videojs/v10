import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentsRoot = resolve(import.meta.dirname, '../../dist/components');

describe('canonical icon components', () => {
  it.each(['default', 'minimal'])('builds named constrained-JSX components for the %s set', async (set) => {
    const [source, types] = await Promise.all([
      readFile(resolve(componentsRoot, set, 'index.js'), 'utf8'),
      readFile(resolve(componentsRoot, set, 'index.d.ts'), 'utf8'),
    ]);

    expect(source).toContain(`import { createComponent } from '@videojs/jsx';`);
    expect(source).toContain(`export const PlayIcon = createComponent({ name: 'PlayIcon' });`);
    expect(source).toContain(`export const PauseIcon = createComponent({ name: 'PauseIcon' });`);
    expect(source).toContain(`export const RestartIcon = createComponent({ name: 'RestartIcon' });`);
    expect(source).not.toContain('COMPONENTS');
    expect(types).toContain(`export declare const PlayIcon: Component<EmptyProps>;`);
  });
});
