import { basename, dirname, resolve } from 'node:path';
import ts from 'typescript';
import type { CompilerSourceMap } from './config';

interface EmitTextWriter {
  getText(): string;
}

interface SourceMapGenerator {
  getSources(): readonly string[];
  setSourceContent(sourceIndex: number, content: string | null): void;
  toJSON(): Omit<CompilerSourceMap, 'file'> & { file?: string | null };
}

interface TypescriptEmitInternals {
  createSourceMapGenerator(
    host: {
      getCurrentDirectory(): string;
      getCanonicalFileName(fileName: string): string;
      useCaseSensitiveFileNames(): boolean;
    },
    file: string,
    sourceRoot: string | undefined,
    sourcesDirectoryPath: string,
    options: { sourceMap: true; inlineSources: true; extendedDiagnostics: false }
  ): SourceMapGenerator;
  createTextWriter(newLine: string): EmitTextWriter;
}

interface SourceMapPrinter extends ts.Printer {
  writeFile(sourceFile: ts.SourceFile, writer: EmitTextWriter, sourceMap: SourceMapGenerator): void;
}

const emitInternals = ts as typeof ts & TypescriptEmitInternals;

export interface PrintedSource {
  code: string;
  map: CompilerSourceMap;
}

export function printSourceFile(
  sourceFile: ts.SourceFile,
  source: string,
  outputFile = sourceFile.fileName
): PrintedSource {
  const outputPath = resolve(outputFile);
  const writer = emitInternals.createTextWriter('\n');
  const generator = emitInternals.createSourceMapGenerator(
    {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => (ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase()),
      useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    },
    basename(outputPath),
    undefined,
    dirname(outputPath),
    { sourceMap: true, inlineSources: true, extendedDiagnostics: false }
  );
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  }) as SourceMapPrinter;

  printer.writeFile(sourceFile, writer, generator);
  for (let index = 0; index < generator.getSources().length; index++) {
    generator.setSourceContent(index, source);
  }

  const rawMap = generator.toJSON();
  return {
    code: writer.getText(),
    map: {
      ...rawMap,
      file: rawMap.file ?? null,
    },
  };
}

export function identitySourceMap(source: string, filename: string, outputFile = filename): CompilerSourceMap {
  const lines = source.split(/\r\n?|\n/).length;
  return {
    version: 3,
    file: basename(outputFile),
    sources: [filename],
    sourcesContent: [source],
    names: [],
    mappings: Array.from({ length: lines }, (_, index) => (index === 0 ? 'AAAA' : 'AACA')).join(';'),
  };
}
