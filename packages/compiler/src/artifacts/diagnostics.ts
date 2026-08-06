import type ts from 'typescript';
import type { CompilerDiagnostic } from '../config';
import type { ArtifactGraphNode } from './graph';
import { compareStrings } from './groups';

export function diagnoseArtifactCycles(nodes: readonly ArtifactGraphNode[], diagnostics: CompilerDiagnostic[]): void {
  const artifacts = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (id: string): void => {
    if (active.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = [...new Set(cycle)].sort(compareStrings).join(':');
      if (!reported.has(key)) {
        reported.add(key);
        diagnostics.push(
          errorDiagnostic('artifact-dependency-cycle', `Artifact dependency cycle: ${cycle.join(' -> ')}.`)
        );
      }
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    active.add(id);
    stack.push(id);
    const artifact = artifacts.get(id);
    if (artifact) {
      for (const dependency of artifact.dependencies.artifacts) visit(dependency);
    }
    stack.pop();
    active.delete(id);
  };

  for (const node of nodes) visit(node.id);
}

export function nodeDiagnostic(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  code: string,
  message: string
): CompilerDiagnostic {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return errorDiagnostic(code, message, sourceFile.fileName, location.line + 1, location.character + 1);
}

export function errorDiagnostic(
  code: string,
  message: string,
  file?: string,
  line?: number,
  column?: number
): CompilerDiagnostic {
  return {
    level: 'error',
    code,
    message,
    plugin: 'videojs/artifacts',
    ...(file ? { file } : {}),
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
  };
}

export function sortDiagnostics(diagnostics: readonly CompilerDiagnostic[]): CompilerDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    return (
      compareStrings(a.file ?? '', b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      compareStrings(a.code, b.code) ||
      compareStrings(a.message, b.message)
    );
  });
}
