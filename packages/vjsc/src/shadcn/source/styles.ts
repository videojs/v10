import { resolve } from 'node:path';
import { loadStyleManifest, type StyleManifest } from '../../styles/manifest';
import type { SourceDefinition } from './define';
import { resolveSource, type Source } from './resolve';

/** Load the style modules required by one or more source items. */
export function loadSourceStyles<const Definition extends SourceDefinition>(
  source: Source<Definition>,
  itemNames: readonly Definition['items'][number]['name'][]
): Promise<StyleManifest> {
  const files = resolveSource(source, itemNames).files.style.map((file) => resolve(source.rootDir, file));
  return loadStyleManifest(files);
}
