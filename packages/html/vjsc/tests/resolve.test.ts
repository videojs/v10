import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'vjsc/ast';

import { resolveHtmlEntries } from '../resolve';

describe('resolveHtmlEntries', () => {
  it('resolves imported element classes', () => {
    const fileName = resolve(import.meta.dirname, '../../src/define/ui/example.ts');
    const sourceFile = parse(`import { ExampleElement } from '../../ui/example-element';\nExampleElement;`, {
      filename: fileName,
    }).ast;
    const importedFile = resolve(import.meta.dirname, '../../src/ui/example-element.ts');
    const importedSource = parse(`export class ExampleElement { static readonly tagName = 'media-example'; }`, {
      filename: importedFile,
    }).ast;

    expect(
      resolveHtmlEntries({
        fileName,
        sourceFile,
        resolveModule: () => ({ fileName: importedFile, sourceFile: importedSource }),
      })
    ).toEqual([
      {
        name: 'Example',
        priority: 2,
        entry: {
          tagName: 'media-example',
          import: { from: '@videojs/html/ui/example', sideEffect: true },
        },
      },
    ]);
  });

  it('resolves element classes declared by the define module', () => {
    const fileName = resolve(import.meta.dirname, '../../src/define/media/example-video.ts');
    const sourceFile = parse(`export class ExampleVideoElement { static readonly tagName = 'example-video'; }`, {
      filename: fileName,
    }).ast;

    expect(
      resolveHtmlEntries({
        fileName,
        sourceFile,
        resolveModule: () => undefined,
      })
    ).toEqual([
      {
        name: 'ExampleVideo',
        priority: 2,
        entry: {
          tagName: 'example-video',
          import: { from: '@videojs/html/media/example-video', sideEffect: true },
        },
      },
    ]);
  });
});
