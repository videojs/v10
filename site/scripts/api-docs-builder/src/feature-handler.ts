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
 *
 * Most features annotate state() with an interface from media/state.ts, which is
 * also the shape the store publishes. A feature that resolves several inputs
 * instead keeps them in private, symbol-keyed source state and publishes the
 * resolved value through `derived`, so its annotation names an interface that
 * lives in the feature's own file and describes internals.
 *
 * When the annotated name isn't in media/state.ts, the published shape is
 * derived from the feature itself: every non-symbol property of the source
 * state (inherited members included, with their JSDoc) plus every `derived`
 * key. Symbol-keyed members are private by construction, so nothing needs to
 * mark them — TypeScript names them `__@SYMBOL@id`, which is how they're
 * recognized. No annotation, and nothing for a feature author to remember.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { FeatureActionDef, FeatureConfigDef, FeatureReference, FeatureStateDef } from './types.js';
import { createTypeScriptProgram } from './typescript.js';
import { getJSDocDescription, log, unwrapObjectLiteral } from './utils.js';

/** TypeScript's name prefix for a member keyed by a unique symbol. */
const SYMBOL_MEMBER_PREFIX = '__@';

const SKIP_FILES = new Set(['index.ts', 'presets.ts', 'feature.parts.ts']);

interface FeatureSource {
  filePath: string;
  name: string;
  /** The state() annotation. Names a media/state.ts interface, or a local one. */
  stateTypeName?: string;
  /** `derived` keys, which publish resolved values alongside the source state. */
  derivedKeys: DerivedKeySource[];
  config: FeatureConfigSource[];
  /** JSDoc on the feature export, used when the shape is derived locally. */
  description?: string;
}

interface DerivedKeySource {
  name: string;
  description?: string;
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
  attribute?: string;
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

      const exportDescription = getJSDocDescription(node);

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
        let derivedKeys: DerivedKeySource[] = [];
        let config: FeatureConfigSource[] = [];
        let silent = false;

        for (const prop of arg.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

          if (prop.name.text === 'name' && ts.isStringLiteral(prop.initializer)) {
            name = prop.initializer.text;
          }

          if (prop.name.text === 'config') {
            config = parseConfigEntries(prop.initializer, name ?? varName);
          }

          if (prop.name.text === 'derived') {
            derivedKeys = parseDerivedKeys(prop.initializer);
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

        if (config.length > 0 && stateFunction) {
          const initialValues = parseStateInitialValues(stateFunction, sourceFile);
          for (const entry of config) {
            entry.defaultValue = initialValues.get(entry.stateKey);
          }
        }

        if (name && (stateTypeName || silent)) {
          sources.push({ filePath, name, stateTypeName, derivedKeys, config, description: exportDescription });
        }
      }
    });
  }

  return sources;
}

/** Read the `derived` map, whose keys are published alongside the source state. */
function parseDerivedKeys(node: ts.Expression): DerivedKeySource[] {
  const literal = unwrapObjectLiteral(node);
  if (!literal) return [];

  const keys: DerivedKeySource[] = [];

  for (const prop of literal.properties) {
    if (!ts.isPropertyAssignment(prop) && !ts.isMethodDeclaration(prop)) continue;
    if (!ts.isIdentifier(prop.name)) continue;

    const key: DerivedKeySource = { name: prop.name.text };
    const description = getJSDocDescription(prop);
    if (description) key.description = description;

    keys.push(key);
  }

  return keys;
}

/**
 * Read the `config` map: `{ title: { action: SET_USER_TITLE, state: USER_TITLE } }`.
 *
 * Each value names a source-state member either as an identifier bound to a
 * private symbol or as a string naming the member outright, which is how an
 * input that forwards to the feature's own public setter is written. An entry
 * naming anything else is dropped — and warned about, because a silently
 * missing input reads to a docs reader as "this feature has no such setting".
 */
function parseConfigEntries(node: ts.Expression, featureName: string): FeatureConfigSource[] {
  const literal = unwrapObjectLiteral(node);
  if (!literal) return [];

  const entries: FeatureConfigSource[] = [];

  for (const prop of literal.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

    const entryLiteral = unwrapObjectLiteral(prop.initializer);
    if (!entryLiteral) continue;

    let actionKey: string | undefined;
    let stateKey: string | undefined;
    let attribute: string | undefined;

    for (const member of entryLiteral.properties) {
      if (!ts.isPropertyAssignment(member) || !ts.isIdentifier(member.name)) continue;

      if (member.name.text === 'html') {
        attribute = htmlAttributeName(member.initializer);
        continue;
      }

      const key = configKeyReference(member.initializer);
      if (!key) continue;

      if (member.name.text === 'action') actionKey = key;
      if (member.name.text === 'state') stateKey = key;
    }

    if (!actionKey || !stateKey) {
      log.warn(
        `feature "${featureName}": config input "${prop.name.text}" has an unreadable action or state — omitted from the reference.`
      );
      continue;
    }

    const entry: FeatureConfigSource = { name: prop.name.text, actionKey, stateKey };
    const description = getJSDocDescription(prop);
    if (description) entry.description = description;
    if (attribute) entry.attribute = attribute;

    entries.push(entry);
  }

  return entries;
}

/**
 * Read the attribute name out of a config entry's `html` block.
 *
 * The name is text in markup rather than a reference to a state or action key,
 * so only a literal counts: an identifier here would be a constant this pass
 * cannot resolve, and guessing at it would put a wrong attribute in the docs.
 */
function htmlAttributeName(node: ts.Expression): string | undefined {
  const literal = unwrapObjectLiteral(node);
  if (!literal) return undefined;

  for (const member of literal.properties) {
    if (!ts.isPropertyAssignment(member) || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== 'attribute') continue;
    if (ts.isStringLiteralLike(member.initializer)) return member.initializer.text;
  }

  return undefined;
}

/**
 * Read the source-state member a config entry points at. An identifier names a
 * symbol constant, so the member is keyed by that symbol; a string names the
 * member itself. Both collapse to the written text, and the lookups that
 * consume it try each shape, since a symbol constant's name and a member name
 * never collide.
 */
function configKeyReference(node: ts.Expression): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteralLike(node)) return node.text;
  return undefined;
}

/**
 * Map each key in the state() object literal to the value it starts at, under
 * the same name a config entry uses to reach it: the identifier inside a
 * computed key, or a published member's own name.
 *
 * A named constant is resolved to its literal so the docs show the value rather
 * than a private identifier; anything else falls back to the written text. A key
 * that starts at `undefined` is left out, because an unset input is what an
 * absent default already says — and every other reference omits it rather than
 * printing "undefined" in the default column.
 */
function parseStateInitialValues(node: ts.Expression, sourceFile: ts.SourceFile): Map<string, string> {
  const values = new Map<string, string>();
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return values;

  const body = ts.isBlock(node.body) ? findReturnedObjectLiteral(node.body) : unwrapObjectLiteral(node.body);
  if (!body) return values;

  const constants = collectLiteralConstants(sourceFile);

  for (const prop of body.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    const key = ts.isComputedPropertyName(prop.name)
      ? ts.isIdentifier(prop.name.expression) && prop.name.expression.text
      : ts.isIdentifier(prop.name) && prop.name.text;
    if (!key) continue;

    const initializer = prop.initializer;
    if (ts.isIdentifier(initializer) && initializer.text === 'undefined') continue;

    const resolved = ts.isIdentifier(initializer) ? constants.get(initializer.text) : undefined;

    values.set(key, resolved ?? initializer.getText(sourceFile));
  }

  return values;
}

/** Map file-level `const NAME = <literal>` declarations to their literal text. */
function collectLiteralConstants(sourceFile: ts.SourceFile): Map<string, string> {
  const constants = new Map<string, string>();

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    if (!(node.declarationList.flags & ts.NodeFlags.Const)) return;

    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      if (!isLiteralInitializer(decl.initializer)) continue;

      constants.set(decl.name.text, decl.initializer.getText(sourceFile));
    }
  });

  return constants;
}

function isLiteralInitializer(node: ts.Expression): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  );
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

// ─── Derived Publication ──────────────────────────────────────────

/**
 * Derive the published shape from the feature itself, for features whose
 * state() annotation names a private interface rather than a media/state.ts one.
 *
 * Every non-symbol property of the source-state type is public — inherited
 * members included, which is how a `MediaMetadataState`-style base contributes
 * its members and their JSDoc. Symbol-keyed members are private by
 * construction. `derived` keys are published on top, typed from what their
 * function returns.
 */
function extractPublishedShape(
  sourceStateDecl: ts.InterfaceDeclaration,
  derivedKeys: readonly DerivedKeySource[],
  derivedLiteral: ts.ObjectLiteralExpression | undefined,
  checker: ts.TypeChecker
): { state: Record<string, FeatureStateDef>; actions: Record<string, FeatureActionDef> } {
  const state: Record<string, FeatureStateDef> = {};
  const actions: Record<string, FeatureActionDef> = {};

  const declaredType = checker.getTypeAtLocation(sourceStateDecl);

  for (const property of checker.getPropertiesOfType(declaredType)) {
    const name = property.escapedName as string;
    if (name.startsWith(SYMBOL_MEMBER_PREFIX)) continue;

    const type = checker.getTypeOfSymbolAtLocation(property, sourceStateDecl);
    const description = ts.displayPartsToString(property.getDocumentationComment(checker)) || undefined;
    const callSignature = checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0];

    if (callSignature) {
      const params = callSignature
        .getParameters()
        .map((p) => `${p.name}: ${formatCheckerType(checker.getTypeOfSymbolAtLocation(p, sourceStateDecl), checker)}`)
        .join(', ');
      const returnType = formatCheckerType(callSignature.getReturnType(), checker);

      const def: FeatureActionDef = { type: `(${params}) => ${returnType}` };
      if (description) def.description = description;
      actions[name] = def;
    } else {
      const def: FeatureStateDef = { type: formatCheckerType(type, checker) };
      if (description) def.description = description;
      state[name] = def;
    }
  }

  for (const key of derivedKeys) {
    const def: FeatureStateDef = { type: derivedValueType(key.name, derivedLiteral, checker) };
    if (key.description) def.description = key.description;
    state[key.name] = def;
  }

  return { state, actions };
}

function derivedValueType(
  name: string,
  derivedLiteral: ts.ObjectLiteralExpression | undefined,
  checker: ts.TypeChecker
): string {
  const property = derivedLiteral?.properties.find((p) => p.name && ts.isIdentifier(p.name) && p.name.text === name);
  if (!property) return 'unknown';

  const value = ts.isPropertyAssignment(property) ? property.initializer : property;
  const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(value), ts.SignatureKind.Call)[0];
  if (!signature) return 'unknown';

  return formatCheckerType(signature.getReturnType(), checker);
}

// ─── Configuration Extraction ─────────────────────────────────────

/**
 * Type each config input from the action it forwards to.
 *
 * An input whose action can't be found is still emitted — the prop exists
 * either way — with its type left unresolved, and warned about so an unresolved
 * type isn't mistaken for a deliberate one.
 */
function extractFeatureConfig(
  entries: readonly FeatureConfigSource[],
  sourceStateDecl: ts.InterfaceDeclaration | undefined,
  checker: ts.TypeChecker,
  featureName: string
): Record<string, FeatureConfigDef> {
  const config: Record<string, FeatureConfigDef> = {};

  for (const entry of entries) {
    const type = configInputType(entry.actionKey, sourceStateDecl, checker);

    if (type === UNRESOLVED_TYPE) {
      log.warn(
        `feature "${featureName}": config input "${entry.name}" points at action "${entry.actionKey}", which has no matching source-state member — type left as "${UNRESOLVED_TYPE}".`
      );
    }

    const def: FeatureConfigDef = { type };
    if (entry.defaultValue) def.default = entry.defaultValue;
    if (entry.description) def.description = entry.description;
    if (entry.attribute) def.attribute = entry.attribute;

    config[entry.name] = def;
  }

  return config;
}

const UNRESOLVED_TYPE = 'unknown';

function configInputType(
  actionKey: string,
  sourceStateDecl: ts.InterfaceDeclaration | undefined,
  checker: ts.TypeChecker
): string {
  if (!sourceStateDecl) return UNRESOLVED_TYPE;

  // A symbol-keyed action is declared in this interface under a computed name,
  // so it is matched by the identifier inside the brackets.
  const member = findComputedMember(sourceStateDecl, actionKey);
  const parameter = member && actionParameter(member);
  if (parameter?.type) return formatCheckerType(checker.getTypeFromTypeNode(parameter.type), checker);

  return namedActionInputType(actionKey, sourceStateDecl, checker);
}

/**
 * Type an action named outright rather than through a symbol. It may be
 * inherited from the published interface the source state extends, so it is
 * matched against the resolved type instead of this declaration's own members.
 */
function namedActionInputType(
  actionKey: string,
  sourceStateDecl: ts.InterfaceDeclaration,
  checker: ts.TypeChecker
): string {
  const declaredType = checker.getTypeAtLocation(sourceStateDecl);
  const property = checker.getPropertiesOfType(declaredType).find((p) => p.escapedName === actionKey);
  if (!property) return UNRESOLVED_TYPE;

  const type = checker.getTypeOfSymbolAtLocation(property, sourceStateDecl);
  const parameter = checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0]?.getParameters()[0];
  if (!parameter) return UNRESOLVED_TYPE;

  return formatCheckerType(checker.getTypeOfSymbolAtLocation(parameter, sourceStateDecl), checker);
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

  // The state file supplies published interfaces. A feature's own file is only
  // needed when it declares config inputs or publishes through `derived`.
  const localFiles = sources.filter(needsOwnSourceFile).map((source) => source.filePath);
  const program = createTypeScriptProgram(monorepoRoot, [stateFilePath, ...new Set(localFiles)]);
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
    const sourceStateDecl = findSourceStateDecl(program, source);
    const config = extractFeatureConfig(source.config, sourceStateDecl, checker, source.name);

    const published = resolvePublishedShape(source, interfaces, sourceStateDecl, program, checker, stateSourceFile);
    if (!published) continue;

    const ref: FeatureReference = {
      name: source.name,
      slug: source.name,
      state: published.state,
      actions: published.actions,
      config,
    };

    if (published.description) ref.description = published.description;

    results.push({ name: source.name, slug: source.name, reference: ref });
  }

  return results;
}

/**
 * A feature file joins the program only when the checker has to read it: to
 * type a config input's private action, or to derive a published shape the
 * state file doesn't hold.
 */
function needsOwnSourceFile(source: FeatureSource): boolean {
  return source.config.length > 0 || source.derivedKeys.length > 0;
}

interface PublishedShape {
  state: Record<string, FeatureStateDef>;
  actions: Record<string, FeatureActionDef>;
  description?: string;
}

/**
 * Prefer the media/state.ts interface the annotation names. When it isn't there,
 * the annotation describes private source state, so derive the published shape
 * from the feature itself.
 */
function resolvePublishedShape(
  source: FeatureSource,
  interfaces: ReadonlyMap<string, ts.InterfaceDeclaration>,
  sourceStateDecl: ts.InterfaceDeclaration | undefined,
  program: ts.Program,
  checker: ts.TypeChecker,
  stateSourceFile: ts.SourceFile
): PublishedShape | undefined {
  if (!source.stateTypeName) return { state: {}, actions: {} };

  const interfaceDecl = interfaces.get(source.stateTypeName);
  if (interfaceDecl) {
    return {
      ...extractInterfaceMembers(interfaceDecl, checker, stateSourceFile),
      description: getJSDocDescription(interfaceDecl),
    };
  }

  if (!sourceStateDecl) {
    log.warn(
      `feature "${source.name}": state() names "${source.stateTypeName}", which is neither in media/state.ts nor declared in the feature file — no reference generated.`
    );
    return undefined;
  }

  const featureSourceFile = program.getSourceFile(source.filePath);
  return {
    ...extractPublishedShape(
      sourceStateDecl,
      source.derivedKeys,
      featureSourceFile && findDerivedLiteral(featureSourceFile),
      checker
    ),
    // No published interface to borrow from, so the feature documents itself.
    description: source.description,
  };
}

/** Locate the interface the feature's state() function annotates, in its own file. */
function findSourceStateDecl(program: ts.Program, source: FeatureSource): ts.InterfaceDeclaration | undefined {
  if (!source.stateTypeName) return undefined;

  const featureSourceFile = program.getSourceFile(source.filePath);
  if (!featureSourceFile) return undefined;

  let found: ts.InterfaceDeclaration | undefined;
  ts.forEachChild(featureSourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === source.stateTypeName) {
      found = node;
    }
  });

  return found;
}

/** Locate the `derived` object literal in a feature file, for typing its values. */
function findDerivedLiteral(sourceFile: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;

    for (const decl of node.declarationList.declarations) {
      if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
      const arg = decl.initializer.arguments[0];
      if (!arg || !ts.isObjectLiteralExpression(arg)) continue;

      for (const prop of arg.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
        if (prop.name.text !== 'derived') continue;
        found = unwrapObjectLiteral(prop.initializer);
      }
    }
  });

  return found;
}
