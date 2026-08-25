import type { BlockStatement, FunctionBody } from '@oxc-project/types';
import type { RolldownMagicString } from 'rolldown';

export type BlockBody = BlockStatement | FunctionBody;

/** Insert statements at the beginning of an existing block body. */
export function prependBlockBody(magicString: RolldownMagicString, body: BlockBody, source: string): void {
  if (!source) return;

  magicString.appendLeft(body.start + 1, `\n${source}\n`);
}
