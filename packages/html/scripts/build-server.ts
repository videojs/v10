import { globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const packageDir = resolve(import.meta.dirname, '..');
const browserDir = resolve(packageDir, 'dist/default');
const serverDir = resolve(packageDir, 'dist/server');
const createPlayerSource = readFileSync(resolve(packageDir, 'src/player/create-player.ts'), 'utf8');
const createPlayerResult = createPlayerSource.match(/export interface CreatePlayerResult[\s\S]*?\n}/)?.[0];

if (!createPlayerResult) throw new Error('Could not find CreatePlayerResult');

const createPlayerReturnsElement = /\bPlayerElement\s*:/.test(createPlayerResult);

const entryFiles = [
  resolve(browserDir, 'index.js'),
  resolve(browserDir, 'i18n/index.js'),
  ...globSync('i18n/locales/**/register.js', { cwd: browserDir }).map((file) => resolve(browserDir, file)),
  ...globSync('icons/**/index.js', { cwd: browserDir }).map((file) => resolve(browserDir, file)),
  ...globSync('define/**/*.js', { cwd: browserDir }).map((file) => resolve(browserDir, file)),
  ...globSync('presets/*.js', { cwd: browserDir }).map((file) => resolve(browserDir, file)),
];

interface Reexport {
  exported: string;
  imported: string;
  source: string;
}

const isServerSafeDependency = (specifier: string) => /^@videojs\/(?:core|media|store|utils)(?:\/|$)/.test(specifier);

function getExports(source: string, file: string): { names: string[]; reexports: Reexport[]; stars: string[] } {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = new Set<string>();
  const imports = new Map<string, Omit<Reexport, 'exported'>>();
  const reexports: Reexport[] = [];
  const stars: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const source = statement.moduleSpecifier.text;
    if (!isServerSafeDependency(source)) continue;

    const clause = statement.importClause;
    if (clause?.name) imports.set(clause.name.text, { imported: 'default', source });
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    for (const element of clause.namedBindings.elements) {
      imports.set(element.name.text, { imported: element.propertyName?.text ?? element.name.text, source });
    }
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue;

    if (!statement.exportClause) {
      if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        stars.push(statement.moduleSpecifier.text);
      }
      continue;
    }

    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      const exported = element.name.text;
      const imported = element.propertyName?.text ?? exported;
      const dependency = imports.get(imported);
      if (dependency) reexports.push({ exported, ...dependency });
      else names.add(exported);
    }
  }

  return { names: [...names].sort(), reexports, stars };
}

function createServerStubs(exportedNames: string[]): string[] {
  const names = new Set(exportedNames);
  const output: string[] = [];

  const take = (name: string): boolean => names.delete(name);

  if (take('createPlayer')) {
    output.push(
      createPlayerReturnsElement
        ? 'function createPlayer() { class PlayerElement {}; class PlayerController {}; return { PlayerElement, PlayerController, playerContext: undefined }; }'
        : 'function createPlayer() { class PlayerController {}; const ProviderMixin = (Base) => Base; const create = () => undefined; return { ProviderMixin, PlayerController, context: undefined, create }; }'
    );
  }
  if (take('createPlayerController')) {
    output.push('function createPlayerController() { return class PlayerController {}; }');
  }
  if (take('createMediaAttachMixin')) {
    output.push('function createMediaAttachMixin() { return (Base) => Base; }');
  }
  if (take('createI18n')) {
    output.push(
      'function createI18n() { const Mixin = (Base) => Base; return { context: undefined, I18nController: class I18nController {}, ProviderMixin: Mixin, TextMixin: Mixin }; }'
    );
  }

  const functionNames = [...names].filter((name) => name === 'safeDefine' || /^define[A-Z]/.test(name));
  if (functionNames.length > 0) {
    output.push('const serverNoop = () => {};');
    for (const name of functionNames) names.delete(name);
  }

  const classNames = [...names].filter(
    (name) => name === 'ReactiveElement' || name.endsWith('Controller') || name.endsWith('Element')
  );
  for (const name of classNames) {
    names.delete(name);
    output.push(`class ${name} {}`);
  }

  const mixinNames = [...names].filter((name) => name.endsWith('Mixin'));
  if (mixinNames.length > 0) {
    output.push('const serverMixin = (Base) => Base;');
    for (const name of mixinNames) names.delete(name);
  }

  if (names.size > 0) output.push('const serverStub = undefined;');

  const bindings = [
    ...['createPlayer', 'createPlayerController', 'createMediaAttachMixin', 'createI18n'].filter((name) =>
      exportedNames.includes(name)
    ),
    ...classNames,
    ...functionNames.map((name) => `serverNoop as ${name}`),
    ...mixinNames.map((name) => `serverMixin as ${name}`),
    ...[...names].map((name) => `serverStub as ${name}`),
  ];
  if (bindings.length > 0) output.push(`export { ${bindings.join(', ')} };`);

  return output;
}

rmSync(serverDir, { recursive: true, force: true });

for (const sourcePath of entryFiles) {
  const outputPath = resolve(serverDir, relative(browserDir, sourcePath));
  const { names, reexports, stars } = getExports(readFileSync(sourcePath, 'utf8'), sourcePath);
  const output: string[] = [];

  output.push(...createServerStubs(names));
  for (const { exported, imported, source } of reexports) {
    const binding = imported === exported ? imported : `${imported} as ${exported}`;
    output.push(`export { ${binding} } from ${JSON.stringify(source)};`);
  }
  for (const specifier of stars) output.push(`export * from ${JSON.stringify(specifier)};`);
  if (output.length === 0) output.push('export {};');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${output.join('\n')}\n`);
}

console.log(`[server-build] ${entryFiles.length} import-safe entry modules`);
