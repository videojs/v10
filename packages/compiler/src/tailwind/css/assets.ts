import { basename, dirname, extname, join } from 'node:path';
import type { CompilerAsset, CompilerContext } from '../../config';
import type { RenderedCss } from './render';

export function cssAssets(
  context: CompilerContext,
  output: string | undefined,
  rendered: RenderedCss
): CompilerAsset[] {
  if (rendered.kind === 'merged') {
    return [
      {
        type: 'css',
        fileName: output ?? defaultCssFileName(context),
        source: rendered.css,
        sourceFile: context.filename,
      },
    ];
  }

  const indexFile = output ?? defaultCssFileName(context);
  const dir = dirname(indexFile);
  const assets: CompilerAsset[] = [
    { type: 'css', fileName: indexFile, source: rendered.index, sourceFile: context.filename },
  ];
  for (const [group, source] of rendered.groups) {
    assets.push({
      type: 'css',
      fileName: join(dir, `${group}.css`),
      source,
      sourceFile: context.filename,
    });
  }
  return assets;
}

function defaultCssFileName(context: CompilerContext): string {
  const file = basename(context.outputFile ?? context.filename);
  const ext = extname(file);
  return `${ext ? file.slice(0, -ext.length) : file}.css`;
}
