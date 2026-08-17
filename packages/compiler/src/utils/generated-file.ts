import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

export interface GeneratedFileOptions {
  readonly cwd?: string | undefined;
  readonly check?: boolean | undefined;
}

export interface GeneratedFileResult {
  readonly outputPath: string;
  readonly code: string;
  readonly changed: boolean;
}

export function writeGeneratedFile(
  output: string,
  code: string,
  options: GeneratedFileOptions = {}
): GeneratedFileResult {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = isAbsolute(output) ? output : resolve(cwd, output);
  const existing = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
  const changed = existing !== code;

  if (changed && options.check) {
    throw new Error(`Generated file is stale: ${outputPath}`);
  }

  if (changed) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, code, 'utf8');
  }

  return { outputPath, code, changed };
}
