import type { Program } from '@oxc-project/types';
import type { RolldownMagicString } from 'rolldown';

import { ModuleImports } from '../ast';

export function createTargetModuleImports(ast: Program, magicString: RolldownMagicString): ModuleImports {
  return new ModuleImports(ast, magicString, {
    collisionSuffix: 'Primitive',
    defaultImportName: 'Target',
  });
}
