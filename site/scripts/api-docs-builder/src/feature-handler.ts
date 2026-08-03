/**
 * Feature reference extraction.
 *
 * Discovers features from packages/core/src/dom/store/features/ and extracts
 * state/action definitions from their state interfaces in media/state.ts.
 *
 * Uses the TypeScript checker API (not TAE) for interface extraction because
 * state interfaces use method signatures (play(): void) which TAE doesn't
 * handle — it only handles property-with-function-type syntax.
 *
 * Convention:
 *   - Feature files: *.ts in the features directory (excluding index, presets, feature.parts)
 *   - Feature exports: const matching *Feature (singular, not *Features)
 *   - State type: explicit return type annotation on the state() arrow function
 *   - Silent features: state() returns an empty object
 *   - State interfaces: exported from packages/media/src/core/state.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { FeatureActionDef, FeatureReference, FeatureStateDef } from './types.js';
import { createTypeScriptProgram } from './typescript.js';
import { getJSDocDescription } from './utils.js';

const SKIP_FILES = new Set(['index.ts', 'presets.ts', 'feature.parts.ts']);

interface FeatureSource {
  filePath: string;
  name: string;
  stateTypeName?: string;
}

export interface FeatureResult {
  name: string;
  slug: string;
  reference: FeatureReference;
}

// ─── Discovery ────────────────────────────────────────────────────

function discoverFeatureSources(featuresDir: string): FeatureSource[] {
  const sources: FeatureSource[] = [];
  const files = fs.readdirSync(featuresDir).filter((f) => f.endsWith('.ts') && !SKIP_FILES.has(f));

  for (const file of files) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isVariableStatement(node)) return;
      if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return;

      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const varName = decl.name.text;
        if (!varName.endsWith('Feature') || varName.endsWith('Features')) continue;

        if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
        const arg = decl.initializer.arguments[0];
        if (!arg || !ts.isObjectLiteralExpression(arg)) continue;

        let name: string | undefined;
        let stateTypeName: string | undefined;
        let silent = false;

        for (const prop of arg.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

          if (prop.name.text === 'name' && ts.isStringLiteral(prop.initializer)) {
            name = prop.initializer.text;
          }

          if (prop.name.text === 'state') {
            const fn = prop.initializer;
            if ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && fn.type && ts.isTypeReferenceNode(fn.type)) {
              stateTypeName = fn.type.typeName.getText(sourceFile);
            } else if (isEmptyState(fn)) {
              silent = true;
            }
          }
        }

        if (name && (stateTypeName || silent)) {
          sources.push({ filePath, name, stateTypeName });
        }
      }
    });
  }

  return sources;
}

function isEmptyState(node: ts.Expression): boolean {
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;
  if (ts.isBlock(node.body)) return false;

  const body = unwrapParentheses(node.body);
  return ts.isObjectLiteralExpression(body) && body.properties.length === 0;
}

function unwrapParentheses(node: ts.Expression): ts.Expression {
  let expression = node;

  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }

  return expression;
}

// ─── Type Formatting ──────────────────────────────────────────────

function formatCheckerType(type: ts.Type, checker: ts.TypeChecker): string {
  if (type.isUnion()) {
    // TypeScript internally represents `boolean` as `false | true`
    const isBooleanUnion =
      type.types.length === 2 && type.types.every((t) => !!(t.flags & ts.TypeFlags.BooleanLiteral));
    if (isBooleanUnion) return 'boolean';

    return type.types.map((t) => formatCheckerType(t, checker)).join(' | ');
  }
  if (type.isStringLiteral()) {
    return `'${type.value}'`;
  }
  return checker.typeToString(type);
}

// ─── Interface Extraction ─────────────────────────────────────────

function extractInterfaceMembers(
  interfaceDecl: ts.InterfaceDeclaration,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): { state: Record<string, FeatureStateDef>; actions: Record<string, FeatureActionDef> } {
  const state: Record<string, FeatureStateDef> = {};
  const actions: Record<string, FeatureActionDef> = {};

  for (const member of interfaceDecl.members) {
    const name = member.name?.getText(sourceFile);
    if (!name) continue;

    const description = getJSDocDescription(member);

    if (ts.isMethodSignature(member)) {
      const params = member.parameters
        .map((p) => {
          const pName = p.name.getText(sourceFile);
          const pType = p.type ? formatCheckerType(checker.getTypeFromTypeNode(p.type), checker) : 'unknown';
          return `${pName}: ${pType}`;
        })
        .join(', ');

      let returnType = 'void';
      if (member.type) {
        returnType = formatCheckerType(checker.getTypeFromTypeNode(member.type), checker);
      }

      const def: FeatureActionDef = { type: `(${params}) => ${returnType}` };
      if (description) def.description = description;
      actions[name] = def;
    } else if (ts.isPropertySignature(member) && member.type) {
      const memberType = checker.getTypeFromTypeNode(member.type);
      const typeStr = formatCheckerType(memberType, checker);
      const def: FeatureStateDef = { type: typeStr };
      if (description) def.description = description;
      state[name] = def;
    }
  }

  return { state, actions };
}

// ─── Pipeline ─────────────────────────────────────────────────────

export function generateFeatureReferences(monorepoRoot: string): FeatureResult[] {
  const featuresDir = path.join(monorepoRoot, 'packages/core/src/dom/store/features');
  const stateFilePath = path.join(monorepoRoot, 'packages/media/src/core/state.ts');

  if (!fs.existsSync(featuresDir) || !fs.existsSync(stateFilePath)) return [];

  const sources = discoverFeatureSources(featuresDir);
  if (sources.length === 0) return [];

  // Create a TS program with the state file for the checker
  const program = createTypeScriptProgram(monorepoRoot, [stateFilePath]);
  const checker = program.getTypeChecker();
  const stateSourceFile = program.getSourceFile(stateFilePath);
  if (!stateSourceFile) return [];

  // Build a map of interface name → declaration
  const interfaces = new Map<string, ts.InterfaceDeclaration>();
  ts.forEachChild(stateSourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      interfaces.set(node.name.text, node);
    }
  });

  const results: FeatureResult[] = [];
  for (const source of sources) {
    if (!source.stateTypeName) {
      const ref: FeatureReference = {
        name: source.name,
        slug: source.name,
        state: {},
        actions: {},
      };

      results.push({ name: source.name, slug: source.name, reference: ref });
      continue;
    }

    const interfaceDecl = interfaces.get(source.stateTypeName);
    if (!interfaceDecl) continue;

    const description = getJSDocDescription(interfaceDecl);
    const { state, actions } = extractInterfaceMembers(interfaceDecl, checker, stateSourceFile);

    const ref: FeatureReference = {
      name: source.name,
      slug: source.name,
      state,
      actions,
    };

    if (description) ref.description = description;

    results.push({ name: source.name, slug: source.name, reference: ref });
  }

  return results;
}
