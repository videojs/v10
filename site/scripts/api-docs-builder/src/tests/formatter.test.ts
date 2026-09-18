import * as path from 'node:path';

import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vite-plus/test';

import { abbreviateType, formatDetailedType, formatProperties, formatType } from '../formatter';
import type { ResolvedType, SourceFile } from '../oxc-project';
import { OxcProject } from '../oxc-project';

const FIXTURE_ROOT = path.resolve(import.meta.dirname, 'fixtures/monorepo');

describe('abbreviateType', () => {
  it('abbreviates functions and callback unions', () => {
    expect(abbreviateType('selector', '((state: object) => string)')).toBe('function');
    expect(abbreviateType('selector', '((state: object) => string) | undefined')).toBe('undefined | function');
    expect(abbreviateType('useMedia', '(() => Media | null)')).toBe('function');
    expect(abbreviateType('useMedia', '(() => Media | null) | undefined')).toBe('undefined | function');
    expect(abbreviateType('onChange', '(value: string) => void')).toBe('function');
    expect(abbreviateType('label', "string | ((state: object) => string) | 'auto'")).toBe("string | 'auto' | function");
    expect(abbreviateType('transform', '((value: string) => string) | ((value: number) => number)')).toBe('function');
    expect(abbreviateType('transform', '((value: string) => string) | ((value: number) => number) | undefined')).toBe(
      'undefined | function'
    );
  });

  it('does not treat nested unions or function properties as top-level function members', () => {
    expect(abbreviateType('result', 'Promise<string | null> | undefined')).toBeUndefined();
    expect(abbreviateType('config', '{ load: (() => void) }')).toBeUndefined();
    expect(abbreviateType('result', 'Promise<() => void> | undefined')).toBeUndefined();
    expect(abbreviateType('result', 'Array<() => void> | null')).toBeUndefined();
    expect(abbreviateType('config', '{ load: (() => void) } | undefined')).toBeUndefined();
    expect(abbreviateType('factory', 'Record<string, (state: State) => string | undefined>')).toBe(
      'Record<string, (state: State) => stri...'
    );
  });

  it('abbreviates only top-level function intersections', () => {
    expect(abbreviateType('PlayerElement', 'typeof UIElement & ((...args: unknown) => PlayerElement)')).toBe(
      'typeof UIElement & function'
    );
    expect(abbreviateType('value', 'A & (() => void) | undefined')).toBe('undefined | A & function');
  });

  it('uses the conventional component display types', () => {
    expect(abbreviateType('className', 'string | ((state: object) => string)')).toBe('string | function');
    expect(abbreviateType('className', 'string | ((state: SliderState) => string | undefined)')).toBe(
      'string | function'
    );
    expect(abbreviateType('style', 'CSSProperties | ((state: object) => CSSProperties)')).toBe(
      'CSSProperties | function'
    );
    expect(abbreviateType('render', 'ReactElement | ((state: object) => ReactElement)')).toBe(
      'ReactElement | function'
    );
  });

  it('leaves compact scalar and union types alone', () => {
    expect(abbreviateType('disabled', 'boolean')).toBeUndefined();
    expect(abbreviateType('size', "'small' | 'large'")).toBeUndefined();
    expect(abbreviateType('size', "'small' | 'medium' | 'large' | 'xlarge'")).toBeUndefined();
  });

  it('abbreviates long object and union types', () => {
    expect(abbreviateType('result', '{ volume: number; muted: boolean; level: string }')).toBe('object');

    const union = "'option-a' | 'option-b' | 'option-c' | 'option-d' | 'option-e'";

    expect(abbreviateType('choice', union)).toBe(`${union.slice(0, 37)}...`);
  });
});

describe('formatType', () => {
  it.each([
    ['boolean', 'boolean'],
    ['string | undefined', 'string | undefined'],
    ['string | undefined', 'string', true],
    ['string | (number | boolean)', 'string | number | boolean'],
    ['{ x: number; y?: number }', '{ x: number; y?: number }'],
    ['string[]', 'string[]'],
    ['(string | number)[]', '(string | number)[]'],
    ['[string, number]', '[string, number]'],
    ['"hello"', "'hello'"],
    ['React.ReactElement<{ x: string }>', 'ReactElement'],
    ['React.CSSProperties', 'CSSProperties'],
    ['Map<string, number>', 'Map<string, number>'],
    ['(x: string) => void', '((x: string) => void)'],
  ])('formats %s', (input, expected, removeUndefined = false) => {
    expect(formatType(parseType(input), removeUndefined)).toBe(expected);
  });

  it('orders null and undefined last and deduplicates unions', () => {
    expect(formatType(parseType('null | string | undefined | number | string'), false)).toBe(
      'string | number | null | undefined'
    );
  });
});

describe('formatDetailedType', () => {
  const project = new OxcProject(FIXTURE_ROOT);
  const gaugeFile = path.join(FIXTURE_ROOT, 'packages/core/src/core/ui/gauge/core.ts');

  it('expands a local alias through the Oxc project resolver', () => {
    const file = project.source(gaugeFile)!;
    const type = parseType('FillLevel', file);

    expect(formatDetailedType(project, type, false)).toBe("'empty' | 'partial' | 'full'");
  });

  it('falls back to the authored reference when it cannot resolve a name', () => {
    const file = project.source(gaugeFile)!;

    expect(formatDetailedType(project, parseType('UnknownType', file), false)).toBe('UnknownType');
  });
});

describe('formatProperties', () => {
  const project = new OxcProject(FIXTURE_ROOT);
  const coreFile = path.join(FIXTURE_ROOT, 'packages/core/src/core/ui/toggle-button/core.ts');
  const declaration = project.resolveName(coreFile, 'ToggleButtonProps')!;
  const type = parseType('ToggleButtonProps', declaration.file);
  const properties = formatProperties(project, project.interfaceMembers(type));

  it('skips ref and @ignore members', () => {
    expect(properties.ref).toBeUndefined();
    expect(properties._internalFlag).toBeUndefined();
  });

  it('preserves descriptions, defaults, required state, and detailed callback types', () => {
    expect(properties.disabled).toMatchObject({
      type: 'boolean',
      description: 'Whether the button is disabled.',
      required: true,
    });
    expect(properties.onPressedChange).toMatchObject({ type: 'function' });
    expect(properties.onPressedChange?.detailedType).toContain('=>');
  });
});

function parseType(typeText: string, context?: SourceFile): ResolvedType {
  const source = `type __Test = ${typeText};`;
  const parsed = parseSync('formatter-test.ts', source);
  const declaration = parsed.program.body[0];
  if (declaration?.type !== 'TSTypeAliasDeclaration') throw new Error(`Could not parse type: ${typeText}`);

  return {
    file: context ?? {
      filePath: 'formatter-test.ts',
      source,
      program: parsed.program,
      comments: parsed.comments,
    },
    type: declaration.typeAnnotation,
  };
}
