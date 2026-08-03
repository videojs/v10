import * as path from 'node:path';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';

/** Load the repository compiler options used by every extraction pipeline. */
export function loadCompilerOptions(monorepoRoot: string): ts.CompilerOptions {
  const config = tae.loadConfig(path.join(monorepoRoot, 'tsconfig.base.json'));
  return { ...config.options, rootDir: monorepoRoot };
}

export function createTypeScriptProgram(
  monorepoRoot: string,
  files: readonly string[],
  overrides?: ts.CompilerOptions
): ts.Program {
  return ts.createProgram([...files], { ...loadCompilerOptions(monorepoRoot), ...overrides });
}
