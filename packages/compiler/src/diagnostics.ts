import { isAbsolute, relative } from 'node:path';
import kleur from 'kleur';
import type ts from 'typescript';
import type { CompilerDiagnostic } from './config';

export type LogLevelName = 'silent' | 'error' | 'warn' | 'info' | 'verbose';
export type DiagnosticFormat = 'default' | 'jsonl';

export enum LogLevel {
  Silent = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Verbose = 4,
}

export interface DiagnosticLocation {
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  endLine?: number | undefined;
  endColumn?: number | undefined;
  sourceText?: string | undefined;
}

export interface DiagnosticErrorDetails extends DiagnosticLocation {
  diagnosticCode?: string | undefined;
  plugin?: string | undefined;
}

/** Error type that carries compiler diagnostic metadata through transform failures. */
export class DiagnosticError extends Error {
  public readonly diagnosticCode: string;
  public readonly fileName?: string;
  public readonly file?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly endLine?: number;
  public readonly endColumn?: number;
  public readonly sourceText?: string;
  public readonly plugin?: string;

  constructor(message: string, location?: DiagnosticErrorDetails | string | undefined, line?: number) {
    super(message);
    this.name = 'DiagnosticError';

    if (typeof location === 'string') {
      this.fileName = location;
      this.file = location;
      if (line !== undefined) this.line = line;
      this.diagnosticCode = 'compiler-diagnostic';
      return;
    }

    this.diagnosticCode = location?.diagnosticCode ?? 'compiler-diagnostic';
    if (location?.file) {
      this.fileName = location.file;
      this.file = location.file;
    }
    if (location?.line !== undefined) this.line = location.line;
    if (location?.column !== undefined) this.column = location.column;
    if (location?.endLine !== undefined) this.endLine = location.endLine;
    if (location?.endColumn !== undefined) this.endColumn = location.endColumn;
    if (location?.sourceText) this.sourceText = location.sourceText;
    if (location?.plugin) this.plugin = location.plugin;
  }
}

export interface FormatDiagnosticOptions {
  color?: boolean | undefined;
  cwd?: string | undefined;
  frameLines?: number | undefined;
}

export interface DiagnosticJsonFrameLine {
  line: number;
  text: string;
  highlight: boolean;
}

export interface DiagnosticJsonEvent {
  type: 'diagnostic';
  level: CompilerDiagnostic['level'];
  code: string;
  message: string;
  plugin?: string | undefined;
  file?: string | undefined;
  range?:
    | {
        start: { line: number; column?: number | undefined };
        end?: { line: number; column?: number | undefined } | undefined;
      }
    | undefined;
  frame?: readonly DiagnosticJsonFrameLine[] | undefined;
}

export interface DiagnosticSummaryJsonEvent {
  type: 'summary';
  errors: number;
  warnings: number;
}

export function mapLogLevelStringToNumber(level: LogLevelName): LogLevel {
  switch (level) {
    case 'silent':
      return LogLevel.Silent;
    case 'error':
      return LogLevel.Error;
    case 'warn':
      return LogLevel.Warn;
    case 'info':
      return LogLevel.Info;
    case 'verbose':
      return LogLevel.Verbose;
  }
}

export function mapLogLevelToString(level: LogLevel): LogLevelName {
  switch (level) {
    case LogLevel.Silent:
      return 'silent';
    case LogLevel.Error:
      return 'error';
    case LogLevel.Warn:
      return 'warn';
    case LogLevel.Info:
      return 'info';
    case LogLevel.Verbose:
      return 'verbose';
  }
}

export function diagnosticLocationFromNode(node: ts.Node): DiagnosticLocation {
  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    file: sourceFile.fileName,
    line: start.line + 1,
    column: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
    sourceText: sourceFile.text,
  };
}

export function withDiagnosticSource(
  diagnostic: CompilerDiagnostic,
  sourceText: string,
  filename: string
): CompilerDiagnostic {
  if (diagnostic.sourceText) return diagnostic;
  if (diagnostic.file && diagnostic.file !== filename) return diagnostic;
  return { ...diagnostic, file: diagnostic.file ?? filename, sourceText };
}

export function fatalDiagnosticFromError(
  error: unknown,
  options: { filename: string; sourceText?: string | undefined; plugin?: string | undefined }
): CompilerDiagnostic {
  const detail = isDiagnosticErrorLike(error) ? error : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const file = detail?.file ?? detail?.fileName ?? options.filename;
  const sourceText = detail?.sourceText ?? (file === options.filename ? options.sourceText : undefined);
  return {
    level: 'error',
    code: detail?.diagnosticCode ?? 'compiler-fatal',
    message,
    file,
    ...(typeof detail?.line === 'number' ? { line: detail.line } : {}),
    ...(typeof detail?.column === 'number' ? { column: detail.column } : {}),
    ...(typeof detail?.endLine === 'number' ? { endLine: detail.endLine } : {}),
    ...(typeof detail?.endColumn === 'number' ? { endColumn: detail.endColumn } : {}),
    ...(sourceText ? { sourceText } : {}),
    ...((detail?.plugin ?? options.plugin) ? { plugin: detail?.plugin ?? options.plugin } : {}),
  };
}

export function formatCompilerDiagnostic(
  diagnostic: CompilerDiagnostic,
  options: FormatDiagnosticOptions = {}
): string {
  const color = options.color ?? shouldUseColor(process.stderr);
  const colors = createColors(color);
  const plugin = diagnostic.plugin ?? 'videojs/compiler';
  const badge = formatLevelBadge(diagnostic.level, colors, color);
  const lines = [`${colors.dim(formatPluginName(plugin, colors))} ${badge}`, '', colors.bold('MESSAGE'), ''];

  lines.push(diagnostic.message);

  const hasLocation = diagnostic.file && diagnostic.line;
  if (hasLocation && diagnostic.sourceText) {
    lines.push('', colors.bold('CODE'), '');
    lines.push(formatLocation(diagnostic, options.cwd ?? process.cwd(), colors));
    lines.push('', formatCodeFrame(diagnostic, diagnostic.sourceText, options.frameLines ?? 5, colors));
  } else if (hasLocation) {
    lines.push('', colors.bold('LOCATION'), '', formatLocation(diagnostic, options.cwd ?? process.cwd(), colors));
  }

  return `${lines.join('\n')}\n`;
}

export function formatCompilerDiagnosticJsonLine(
  diagnostic: CompilerDiagnostic,
  options: FormatDiagnosticOptions = {}
): string {
  return `${JSON.stringify(compilerDiagnosticToJsonEvent(diagnostic, options))}\n`;
}

export function compilerDiagnosticToJsonEvent(
  diagnostic: CompilerDiagnostic,
  options: FormatDiagnosticOptions = {}
): DiagnosticJsonEvent {
  const cwd = options.cwd ?? process.cwd();
  const file = diagnostic.file ? formatFilePath(diagnostic.file, cwd) : undefined;
  const range = diagnosticRange(diagnostic);
  const frame = diagnostic.sourceText
    ? buildJsonFrame(diagnostic, diagnostic.sourceText, options.frameLines ?? 5)
    : undefined;

  return {
    type: 'diagnostic',
    level: diagnostic.level,
    code: diagnostic.code,
    message: diagnostic.message,
    ...(diagnostic.plugin ? { plugin: diagnostic.plugin } : {}),
    ...(file ? { file } : {}),
    ...(range ? { range } : {}),
    ...(frame && frame.length > 0 ? { frame } : {}),
  };
}

export function formatDiagnosticSummaryJsonLine(diagnostics: readonly CompilerDiagnostic[]): string {
  return `${JSON.stringify(diagnosticSummaryToJsonEvent(diagnostics))}\n`;
}

export function diagnosticSummaryToJsonEvent(diagnostics: readonly CompilerDiagnostic[]): DiagnosticSummaryJsonEvent {
  let errors = 0;
  let warnings = 0;
  for (const diagnostic of diagnostics) {
    if (diagnostic.level === 'error') errors++;
    if (diagnostic.level === 'warning') warnings++;
  }
  return { type: 'summary', errors, warnings };
}

export function shouldUseColor(stream: NodeJS.WriteStream): boolean {
  return Boolean(stream.isTTY && !process.env.NO_COLOR);
}

interface DiagnosticErrorLike {
  diagnosticCode?: string | undefined;
  file?: string | undefined;
  fileName?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  endLine?: number | undefined;
  endColumn?: number | undefined;
  sourceText?: string | undefined;
  plugin?: string | undefined;
}

interface Colors {
  black(text: string): string;
  bold(text: string): string;
  dim(text: string): string;
  white(text: string): string;
  yellow(text: string): string;
  bgRed(text: string): string;
  bgYellow(text: string): string;
}

interface CodeFrame {
  firstLineNumber: number;
  totalLines: number;
  linesBefore: string[];
  relevantLines: string[];
  linesAfter: string[];
  hiddenLines: number;
}

function isDiagnosticErrorLike(error: unknown): error is DiagnosticErrorLike {
  return typeof error === 'object' && error !== null;
}

function createColors(enabled: boolean): Colors {
  if (enabled) return kleur;
  const passthrough = (text: string): string => text;
  return {
    black: passthrough,
    bold: passthrough,
    dim: passthrough,
    white: passthrough,
    yellow: passthrough,
    bgRed: passthrough,
    bgYellow: passthrough,
  };
}

function formatPluginName(name: string, colors: Colors): string {
  return `[${name.startsWith('videojs') || name.startsWith('@videojs') ? colors.dim(name) : colors.yellow(name)}]`;
}

function formatLevelBadge(level: CompilerDiagnostic['level'], colors: Colors, color: boolean): string {
  if (!color) return level.toUpperCase();
  const label = colors.bold(colors.black(` ${level.toUpperCase()} `));
  return level === 'error' ? colors.bgRed(label) : colors.bgYellow(label);
}

function formatLocation(diagnostic: CompilerDiagnostic, cwd: string, colors: Colors): string {
  const file = formatFilePath(diagnostic.file!, cwd);
  const line = diagnostic.line!;
  const lineRange = diagnostic.endLine && diagnostic.endLine !== line ? `${line}-${diagnostic.endLine}` : `${line}`;
  const column = diagnostic.column ? `:${diagnostic.column}` : '';
  return `${colors.dim(file)} ${colors.dim('L:')}${colors.dim(`${lineRange}${column}`)}`;
}

function diagnosticRange(diagnostic: CompilerDiagnostic): DiagnosticJsonEvent['range'] {
  if (!diagnostic.line) return undefined;
  const start = {
    line: diagnostic.line,
    ...(diagnostic.column ? { column: diagnostic.column } : {}),
  };
  const endLine = diagnostic.endLine ?? diagnostic.line;
  const end = {
    line: endLine,
    ...(diagnostic.endColumn ? { column: diagnostic.endColumn } : {}),
  };
  return diagnostic.endLine || diagnostic.endColumn ? { start, end } : { start };
}

function formatFilePath(file: string, cwd: string): string {
  if (!isAbsolute(file)) return file;
  const next = relative(cwd, file);
  return next && !next.startsWith('..') ? next : file;
}

function formatCodeFrame(
  diagnostic: CompilerDiagnostic,
  sourceText: string,
  frameLines: number,
  colors: Colors
): string {
  const codeFrame = buildCodeFrame(sourceText, diagnostic.line!, diagnostic.endLine ?? diagnostic.line!, frameLines);
  const { firstLineNumber, linesBefore, relevantLines, linesAfter } = codeFrame;
  const printed: string[] = [];
  const maxDigits = Math.max(1, String(firstLineNumber + codeFrame.totalLines).length);
  const printLine = (line: string, lineNumber: number, relevant = false): string => {
    const number = String(lineNumber).padStart(maxDigits, ' ');
    const text = `${relevant ? '> ' : '  '}${colors.bold(number)} |  ${line}`;
    return relevant ? colors.white(text) : colors.dim(text);
  };

  for (let i = 0; i < linesBefore.length; i++) {
    printed.push(printLine(linesBefore[i]!, firstLineNumber + i));
  }

  for (let i = 0; i < relevantLines.length; i++) {
    printed.push(printLine(relevantLines[i]!, firstLineNumber + linesBefore.length + i, true));
  }

  for (let i = 0; i < linesAfter.length; i++) {
    printed.push(printLine(linesAfter[i]!, firstLineNumber + linesBefore.length + relevantLines.length + i));
  }

  if (codeFrame.hiddenLines > 0) {
    const label = codeFrame.hiddenLines === 1 ? 'line' : 'lines';
    printed.push(colors.dim(`${codeFrame.hiddenLines} ${label} hidden...`));
  }

  return printed.join('\n');
}

function buildJsonFrame(
  diagnostic: CompilerDiagnostic,
  sourceText: string,
  frameLines: number
): DiagnosticJsonFrameLine[] {
  if (!diagnostic.line) return [];
  const codeFrame = buildCodeFrame(sourceText, diagnostic.line, diagnostic.endLine ?? diagnostic.line, frameLines);
  const lines: DiagnosticJsonFrameLine[] = [];
  const { firstLineNumber, linesBefore, relevantLines, linesAfter } = codeFrame;

  for (let i = 0; i < linesBefore.length; i++) {
    lines.push({ line: firstLineNumber + i, text: linesBefore[i]!, highlight: false });
  }

  for (let i = 0; i < relevantLines.length; i++) {
    lines.push({ line: firstLineNumber + linesBefore.length + i, text: relevantLines[i]!, highlight: true });
  }

  for (let i = 0; i < linesAfter.length; i++) {
    lines.push({
      line: firstLineNumber + linesBefore.length + relevantLines.length + i,
      text: linesAfter[i]!,
      highlight: false,
    });
  }

  return lines;
}

function buildCodeFrame(
  sourceText: string,
  startLineNumber: number,
  endLineNumber: number,
  frameSize: number
): CodeFrame {
  const lines = splitSourceLines(sourceText);
  const firstRelevant = Math.max(0, startLineNumber - 1);
  const lastRelevant = Math.max(firstRelevant, Math.min(lines.length - 1, endLineNumber - 1));
  const start = Math.max(0, firstRelevant - frameSize);
  const end = Math.min(lines.length - 1, lastRelevant + frameSize);
  const maxLines = 15;
  const visibleEnd = Math.min(end, start + maxLines - 1);
  const linesBefore: string[] = [];
  const relevantLines: string[] = [];
  const linesAfter: string[] = [];

  for (let i = start; i <= visibleEnd; i++) {
    const line = lines[i] ?? '';
    if (i < firstRelevant) {
      linesBefore.push(line);
    } else if (i <= lastRelevant) {
      relevantLines.push(line);
    } else {
      linesAfter.push(line);
    }
  }

  return {
    firstLineNumber: start + 1,
    totalLines: linesBefore.length + relevantLines.length + linesAfter.length,
    linesBefore,
    relevantLines,
    linesAfter,
    hiddenLines: end - visibleEnd,
  };
}

function splitSourceLines(sourceText: string): string[] {
  return sourceText.replace(/\r\n?/g, '\n').split('\n');
}
