import ts from 'typescript';

import type { ImportRule } from './transforms/imports';
import { transformImports } from './transforms/imports';
import type { CompilerPlugin, CompilerTransform } from './types';

/** Adapt a TypeScript transformer factory to the compiler plugin lifecycle. */
export function transformPlugin(name: string, transform: CompilerTransform): CompilerPlugin {
  return {
    name,
    transform(module, context) {
      return context.apply(module.sourceFile, transform);
    },
  };
}

/** Rewrite authored module imports through ordinary compiler plugin ordering. */
export function importsPlugin(rules: Record<string, ImportRule>): CompilerPlugin {
  return {
    name: 'vjsc:imports',
    transform(module, context) {
      if (
        !module.sourceFile.statements.some(
          (statement) =>
            ts.isImportDeclaration(statement) &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            statement.moduleSpecifier.text in rules
        )
      ) {
        return null;
      }
      return context.apply(
        module.sourceFile,
        transformImports({
          rules,
          configDir: context.cwd,
          ...(context.outputFile ? { outputFile: context.outputFile } : {}),
        })
      );
    },
  };
}
