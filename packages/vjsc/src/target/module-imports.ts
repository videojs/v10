import type { Program } from '@oxc-project/types';
import type { RolldownMagicString } from 'rolldown';

import { ModuleImports } from '../ast';

export function createTargetModuleImports(ast: Program, magicString: RolldownMagicString): ModuleImports {
  return new ModuleImports(ast, magicString, {
    collisionSuffix: 'Primitive',
    defaultImportName: 'Target',
  });
}

/** Collect the `import type` statements a target transform needs for generated props and type aliases. */
export function createTargetTypeImports(ast: Program, magicString: RolldownMagicString): ModuleImports {
  return new ModuleImports(ast, magicString, { kind: 'type', collisionSuffix: 'Type' });
}
