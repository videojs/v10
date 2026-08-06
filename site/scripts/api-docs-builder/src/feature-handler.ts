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
 *   - Published state override: `@state <InterfaceName>` on the feature export
 *   - Silent features: state() returns an empty object
 *   - State interfaces: exported from packages/media/src/core/state.ts
 *
 * A feature that resolves several inputs keeps them in private source state and
 * publishes the resolved value through `derived`, so its state() annotation
 * describes internals rather than the store surface. Those features name their
 * published interface with `@state` on the feature export, which wins over the
 * state() annotation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { FeatureActionDef, FeatureConfigDef, FeatureReference, FeatureStateDef } from './types.js';
import { createTypeScriptProgram } from './typescript.js';
import { getJSDocDescription, getJSDocTagValue, unwrapObjectLiteral } from './utils.js';

const SKIP_FILES = new Set(['index.ts', 'presets.ts', 'feature.parts.ts']);

interface FeatureSource {
  filePath: string;
  name: string;
  stateTypeName?: string;
  /** The state() annotation, which declares the private keys `config` points at. */
  sourceStateTypeName?: string;
  config: FeatureConfigSource[];
}

/**
 * One `config` entry, resolved to the private source-state keys it drives.
 * `actionKey` types the input; `stateKey` supplies its initial value.
 */
interface FeatureConfigSource {
  name: string;
  actionKey: string;
  stateKey: string;
  description?: string;
  defaultValue?: string;
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

      const publishedStateTypeName = getJSDocTagValue(node, 'state');

      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const varName = decl.name.text;
        if (!varName.endsWith('Feature') || varName.endsWith('Features')) continue;

        if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
        const arg = decl.initializer.arguments[0];
        if (!arg || !ts.isObjectLiteralExpression(arg)) continue;

        let name: string | undefined;
        let stateTypeName: string | undefined;
        let stateFunction: ts.Expression | undefined;
        let config: FeatureConfigSource[] = [];
        let silent = false;

        for (const prop of arg.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

          if (prop.name.text === 'name' && ts.isStringLiteral(prop.initializer)) {
            name = prop.initializer.text;
          }

          if (prop.name.text === 'config') {
            config = parseConfigEntries(prop.initializer);
          }

          if (prop.name.text === 'state') {
            const fn = prop.initializer;
            stateFunction = fn;
            if ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && fn.type && ts.isTypeReferenceNode(fn.type)) {
              stateTypeName = fn.type.typeName.getText(sourceFile);
            } else if (isEmptyState(fn)) {
              silent = true;
            }
          }
        }

        const sourceStateTypeName = stateTypeName;

        // The published interface wins: source state is an implementation detail.
        if (publishedStateTypeName) stateTypeName = publishedStateTypeName;

        if (config.length > 0 && stateFunction) {
          const initialValues = parseStateInitialValues(stateFunction, sourceFile);
          for (const entry of config) {
            entry.defaultValue = initialValues.get(entry.stateKey);
          }
        }

        if (name && (stateTypeName || silent)) {
          sources.push({ filePath, name, stateTypeName, sourceStateTypeName, config });
        }
      }
    });
  }

  return sources;
}

/**
 * Read the `config` map: `{ contentTitle: { action: SET_X, state: USER_X } }`.
 *
 * Both values are identifiers bound to private symbols. Entries naming
 * anything else are skipped rather than guessed at.
 */
function parseConfigEntries(node: ts.Expression): FeatureConfigSource[] {
  const literal = unwrapObjectLiteral(node);
  if (!literal) return [];

  const entries: FeatureConfigSource[] = [];

  for (const prop of literal.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

    const entryLiteral = unwrapObjectLiteral(prop.initializer);
    if (!entryLiteral) continue;

    let actionKey: string | undefined;
    let stateKey: string | undefined;

    for (const member of entryLiteral.properties) {
      if (!ts.isPropertyAssignment(member) || !ts.isIdentifier(member.name)) continue;
      if (!ts.isIdentifier(member.initializer)) continue;

      if (member.name.text === 'action') actionKey = member.initializer.text;
      if (member.name.text === 'state') stateKey = member.initializer.text;
    }

    if (!actionKey || !stateKey) continue;

    const entry: FeatureConfigSource = { name: prop.name.text, actionKey, stateKey };
    const description = getJSDocDescription(prop);
    if (description) entry.description = description;

    entries.push(entry);
  }

  return entries;
}

/**
 * Map each computed key in the state() object literal to its initializer text,
 * so a config input can report the value it starts at.
 */
function parseStateInitialValues(node: ts.Expression, sourceFile: ts.SourceFile): Map<string, string> {
  const values = new Map<string, string>();
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return values;

  const body = ts.isBlock(node.body) ? findReturnedObjectLiteral(node.body) : unwrapObjectLiteral(node.body);
  if (!body) return values;

  for (const prop of body.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isComputedPropertyName(prop.name) || !ts.isIdentifier(prop.name.expression)) continue;

    values.set(prop.name.expression.text, prop.initializer.getText(sourceFile));
  }

  return values;
}

function findReturnedObjectLiteral(block: ts.Block): ts.ObjectLiteralExpression | undefined {
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) {
      return unwrapObjectLiteral(statement.expression);
    }
  }
  return undefined;
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

// ─── Configuration Extraction ─────────────────────────────────────

/**
 * Type each config input from the private action it forwards to.
 *
 * The action is declared in the feature's own source-state interface under a
 * computed symbol key, so the member is matched by the identifier inside the
 * brackets rather than by name. An input whose action can't be found is still
 * emitted — the prop exists either way — with its type left unresolved.
 */
function extractFeatureConfig(
  entries: readonly FeatureConfigSource[],
  sourceStateDecl: ts.InterfaceDeclaration | undefined,
  checker: ts.TypeChecker
): Record<string, FeatureConfigDef> {
  const config: Record<string, FeatureConfigDef> = {};

  for (const entry of entries) {
    const def: FeatureConfigDef = { type: configInputType(entry.actionKey, sourceStateDecl, checker) };
    if (entry.defaultValue) def.default = entry.defaultValue;
    if (entry.description) def.description = entry.description;

    config[entry.name] = def;
  }

  return config;
}

function configInputType(
  actionKey: string,
  sourceStateDecl: ts.InterfaceDeclaration | undefined,
  checker: ts.TypeChecker
): string {
  const member = sourceStateDecl && findComputedMember(sourceStateDecl, actionKey);
  if (!member) return 'unknown';

  const parameter = actionParameter(member);
  if (!parameter?.type) return 'unknown';

  return formatCheckerType(checker.getTypeFromTypeNode(parameter.type), checker);
}

function findComputedMember(decl: ts.InterfaceDeclaration, identifier: string): ts.TypeElement | undefined {
  return decl.members.find((member) => {
    const name = member.name;
    return name && ts.isComputedPropertyName(name) && ts.isIdentifier(name.expression)
      ? name.expression.text === identifier
      : false;
  });
}

/** Config actions are written as method signatures or as function-typed properties. */
function actionParameter(member: ts.TypeElement): ts.ParameterDeclaration | undefined {
  if (ts.isMethodSignature(member)) return member.parameters[0];
  if (ts.isPropertySignature(member) && member.type && ts.isFunctionTypeNode(member.type)) {
    return member.type.parameters[0];
  }
  return undefined;
}

// ─── Pipeline ─────────────────────────────────────────────────────

export function generateFeatureReferences(monorepoRoot: string): FeatureResult[] {
  const featuresDir = path.join(monorepoRoot, 'packages/core/src/dom/store/features');
  const stateFilePath = path.join(monorepoRoot, 'packages/media/src/core/state.ts');

  if (!fs.existsSync(featuresDir) || !fs.existsSync(stateFilePath)) return [];

  const sources = discoverFeatureSources(featuresDir);
  if (sources.length === 0) return [];

  // The state file supplies published interfaces; a configured feature's own
  // file supplies the private action signatures its config inputs forward to.
  const configuredFiles = sources.filter((source) => source.config.length > 0).map((source) => source.filePath);
  const program = createTypeScriptProgram(monorepoRoot, [stateFilePath, ...configuredFiles]);
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
    const config = extractFeatureConfig(source.config, findSourceStateDecl(program, source), checker);

    if (!source.stateTypeName) {
      const ref: FeatureReference = {
        name: source.name,
        slug: source.name,
        state: {},
        actions: {},
        config,
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
      config,
    };

    if (description) ref.description = description;

    results.push({ name: source.name, slug: source.name, reference: ref });
  }

  return results;
}

/** Locate the interface the feature's state() function annotates, in its own file. */
function findSourceStateDecl(program: ts.Program, source: FeatureSource): ts.InterfaceDeclaration | undefined {
  if (source.config.length === 0 || !source.sourceStateTypeName) return undefined;

  const featureSourceFile = program.getSourceFile(source.filePath);
  if (!featureSourceFile) return undefined;

  let found: ts.InterfaceDeclaration | undefined;
  ts.forEachChild(featureSourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === source.sourceStateTypeName) {
      found = node;
    }
  });

  return found;
}
