/**
 * Component reference discovery, extraction, and building.
 *
 * Kept separate from the CLI so E2E tests can run the component pipeline against a fixture monorepo by passing a custom
 * root path.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseSync } from 'oxc-parser';

import { NAME_OVERRIDES } from '../../../src/utils/api-reference-overrides.js';
import { extractCore } from './core-handler.js';
import { extractCSSVars } from './css-vars-handler.js';
import { extractDataAttrs } from './data-attrs-handler.js';
import { abbreviateType } from './formatter.js';
import { extractHtml } from './html-handler.js';
import { getJSDocTag, OxcProject, staticName } from './oxc-project.js';
import { extractPartDescription, extractParts, extractSubPartProps, type PartExport } from './parts-handler.js';
import type {
  ComponentReference,
  ComponentSource,
  CoreExtraction,
  CSSVarDef,
  CSSVarsExtraction,
  DataAttrDef,
  DataAttrsExtraction,
  ExtraDataAttrsSource,
  HtmlExtraction,
  PartReference,
  PartSource,
  PropDef,
  StateDef,
} from './types.js';
import { kebabToPascal, log, partKebabFromSource, pascalToKebab, sortProps } from './utils.js';

// ─── Overrides ─────────────────────────────────────────────────────

// `NAME_OVERRIDES` is the source of truth shared with the site's reference
// pages — re-exported here for the builder's existing import surface.
export { NAME_OVERRIDES };

// Parts whose HTML element file basename differs from the part kebab.
// Key: `{component}/{part-kebab}`, Value: element file basename (without `.ts`).
export const PART_ELEMENT_OVERRIDES: Record<string, string> = {
  'tooltip/provider': 'group',
};

// ─── Build Helpers ─────────────────────────────────────────────────

export function buildProps(coreData: CoreExtraction): Record<string, PropDef> {
  const props: Record<string, PropDef> = {};

  for (const prop of coreData.props) {
    props[prop.name] = {
      type: prop.type,
      detailedType: prop.detailedType,
      description: prop.description,
      default: coreData.defaultProps[prop.name] ?? prop.default,
      required: prop.required,
    };

    if (props[prop.name]!.detailedType === undefined) delete props[prop.name]!.detailedType;

    if (props[prop.name]!.description === undefined) delete props[prop.name]!.description;

    if (props[prop.name]!.default === undefined) delete props[prop.name]!.default;

    if (!props[prop.name]!.required) delete props[prop.name]!.required;
  }

  return props;
}

export function buildState(coreData: CoreExtraction): Record<string, StateDef> {
  const state: Record<string, StateDef> = {};

  for (const s of coreData.state) {
    state[s.name] = {
      type: s.type,
      detailedType: s.detailedType,
      description: s.description,
    };

    if (state[s.name]!.detailedType === undefined) delete state[s.name]!.detailedType;

    if (state[s.name]!.description === undefined) delete state[s.name]!.description;
  }

  return state;
}

export function buildDataAttrs(dataAttrsData: DataAttrsExtraction): Record<string, DataAttrDef> {
  const dataAttributes: Record<string, DataAttrDef> = {};

  for (const attr of dataAttrsData.attrs) {
    const def: DataAttrDef = { description: attr.description };

    if (attr.type) {
      const abbreviated = abbreviateType(attr.name, attr.type);

      if (abbreviated) {
        def.type = abbreviated;
        def.detailedType = attr.type;
      } else {
        def.type = attr.type;
      }
    }

    dataAttributes[attr.name] = def;
  }

  return dataAttributes;
}

export function buildCSSVars(cssVarsData: CSSVarsExtraction): Record<string, CSSVarDef> {
  const cssCustomProperties: Record<string, CSSVarDef> = {};

  for (const v of cssVarsData.vars) {
    cssCustomProperties[v.name] = { description: v.description };
  }

  return cssCustomProperties;
}

function buildHtmlPlatform(htmlData: HtmlExtraction): NonNullable<PartReference['platforms']['html']> {
  const platform: NonNullable<PartReference['platforms']['html']> = { tagName: htmlData.tagName };

  if (htmlData.events.length > 0) platform.events = htmlData.events;

  return platform;
}

// ─── Discovery ─────────────────────────────────────────────────────

// Extra data-attrs files in a component dir declare their target parts with
// a `@parts item, radio-item` JSDoc tag on an exported `*DataAttrs` const.
// They cover attrs a DOM layer applies to part elements directly, which the
// per-part stateAttrMap heuristic can't see (e.g. menu/item.ts applied by
// dom/ui/menu/menu.ts). Any simple file name works; discovery keys off the
// tag, not the file name.
function discoverExtraDataAttrs(componentDir: string): ExtraDataAttrsSource[] {
  const extras: ExtraDataAttrsSource[] = [];

  for (const entry of fs.readdirSync(componentDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'data.ts') continue;

    const filePath = path.join(componentDir, entry.name);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('@parts')) continue;

    const parsed = parseSync(filePath, content);
    const sourceFile = { filePath, source: content, program: parsed.program, comments: parsed.comments };

    for (const statement of parsed.program.body) {
      if (statement.type !== 'ExportNamedDeclaration') continue;

      const declaration = statement.declaration;
      if (declaration?.type !== 'VariableDeclaration') continue;

      const exportName = declaration.declarations
        .map((declarator) => staticName(declarator.id))
        .find((name) => name?.endsWith('DataAttrs'));
      if (!exportName) continue;

      const tagValue = getJSDocTag(sourceFile, declaration, 'parts');
      if (!tagValue) continue;

      const parts = tagValue
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length === 0) continue;

      extras.push({ path: filePath, exportName, parts });
    }
  }

  return extras;
}

function findFiles(directory: string, matches: (name: string) => boolean): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'tests') files.push(...findFiles(entryPath, matches));
    } else if (matches(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

export function discoverComponents(monorepoRoot: string): ComponentSource[] {
  const coreUiPath = path.join(monorepoRoot, 'packages/core/src/core/ui');
  const htmlUiPath = path.join(monorepoRoot, 'packages/html/src/ui');
  const reactUiPath = path.join(monorepoRoot, 'packages/react/src/ui');

  const components: ComponentSource[] = [];

  if (!fs.existsSync(coreUiPath)) {
    return components;
  }

  const dirs = fs.readdirSync(coreUiPath, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const componentName = NAME_OVERRIDES[dir.name] ?? kebabToPascal(dir.name);
    const componentDir = path.join(coreUiPath, dir.name);

    const coreFile = path.join(componentDir, 'core.ts');
    const dataAttrsFile = path.join(componentDir, 'data.ts');
    const cssVarsFile = path.join(componentDir, 'vars.ts');
    const htmlFile = path.join(htmlUiPath, dir.name, 'element.ts');

    const source: ComponentSource = {
      name: componentName,
      kebab: dir.name,
    };

    if (fs.existsSync(coreFile)) source.corePath = coreFile;

    if (fs.existsSync(dataAttrsFile)) source.dataAttrsPath = dataAttrsFile;

    if (fs.existsSync(cssVarsFile)) source.cssVarsPath = cssVarsFile;

    if (fs.existsSync(htmlFile)) source.htmlPath = htmlFile;

    const partsIndexFile = path.join(reactUiPath, dir.name, 'index.parts.ts');

    if (fs.existsSync(partsIndexFile)) source.partsIndexPath = partsIndexFile;

    const extraDataAttrs = discoverExtraDataAttrs(componentDir);

    if (extraDataAttrs.length > 0) source.extraDataAttrs = extraDataAttrs;

    if (source.corePath) {
      components.push(source);
    }
  }

  return components;
}

// ─── Program Creation ──────────────────────────────────────────────

export function createComponentProgram(_sources: ComponentSource[], monorepoRoot: string): OxcProject {
  return new OxcProject(monorepoRoot);
}

// ─── Part Discovery ────────────────────────────────────────────────

function instantiatesCore(filePath: string, componentName: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    return new RegExp(`new ${componentName}Core\\b`).test(content);
  } catch {
    return false;
  }
}

function usesDataAttrs(filePath: string): boolean {
  try {
    return fs.readFileSync(filePath, 'utf-8').includes('stateAttrMap');
  } catch {
    return false;
  }
}

interface PartElementFile {
  path: string;
  /**
   * Element class name, derived from the component folder and file basename (`slider/track.ts` ->
   * `SliderTrackElement`).
   */
  className: string;
}

// Part element files sit beside the primary `element.ts` and are named after the part kebab
// (`slider/track.ts`). A nested React part source (`./chapters/title`) is honored when the
// same folder exists on the HTML side; otherwise the part is looked up flat in the component dir.
function resolvePartElement(
  htmlDir: string,
  componentKebab: string,
  source: string,
  partKebab: string
): PartElementFile | undefined {
  const basename = PART_ELEMENT_OVERRIDES[`${componentKebab}/${partKebab}`] ?? partKebab;
  const relativeDir = path.dirname(source.replace(/^\.\//, ''));
  const candidates = [path.join(htmlDir, `${basename}.ts`)];

  if (relativeDir !== '.') candidates.unshift(path.join(htmlDir, relativeDir, `${basename}.ts`));

  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) return undefined;

  return { path: filePath, className: `${kebabToPascal(`${componentKebab}-${basename}`)}Element` };
}

export function discoverParts(source: ComponentSource, program: OxcProject, monorepoRoot: string): PartSource[] {
  if (!source.partsIndexPath) return [];

  const htmlUiPath = path.join(monorepoRoot, 'packages/html/src/ui');
  const coreUiPath = path.join(monorepoRoot, 'packages/core/src/core/ui');

  const partExports = extractParts(source.partsIndexPath, program);
  if (partExports.length === 0) return [];

  const namedExports = partExports.filter((p) => p.kind === 'named');
  const localExports = namedExports.filter((p) => p.source.startsWith('./'));
  const nonLocalExports = namedExports.filter((p) => !p.source.startsWith('./'));
  const namespaceExports = partExports.filter((p) => p.kind === 'namespace' && p.source.startsWith('./'));

  const componentKebab = source.kebab;
  const htmlDir = path.join(htmlUiPath, componentKebab);

  // Parts that share one source file (`./component` exporting Root, Options, and Value) are named after
  // their export; a file-derived kebab would collide and collapse them into a single part.
  const sharedSources = new Set(
    localExports.map((part) => part.source).filter((value, index, all) => all.indexOf(value) !== index)
  );

  const parts: PartSource[] = [];

  for (const partExport of localExports) {
    const kebab = sharedSources.has(partExport.source)
      ? pascalToKebab(partExport.name)
      : partKebabFromSource(partExport.source, componentKebab);

    const partElement = resolvePartElement(htmlDir, componentKebab, partExport.source, kebab);

    const reactFile = path.join(path.dirname(source.partsIndexPath!), `${partExport.source.replace('./', '')}.tsx`);
    const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

    parts.push({
      name: partExport.name,
      localName: partExport.localName,
      kebab,
      isPrimary: !!reactPath && instantiatesCore(reactPath, source.name),
      htmlPath: partElement?.path,
      htmlElementName: partElement?.className,
      reactPath,
    });
  }

  selectPrimaryPart(parts, source);

  for (const part of parts) {
    if (part.isPrimary || !part.reactPath || !usesDataAttrs(part.reactPath)) continue;

    part.dataAttrsPath = source.dataAttrsPath;
    part.dataAttrsComponentName = source.name;
  }

  for (const namespaceExport of namespaceExports) {
    parts.push(
      ...discoverNamespaceParts(namespaceExport, source.partsIndexPath, componentKebab, htmlDir, coreUiPath, program)
    );
  }

  if (nonLocalExports.length > 0) {
    const bySource = new Map<string, typeof nonLocalExports>();

    for (const exp of nonLocalExports) {
      const list = bySource.get(exp.source) ?? [];

      list.push(exp);
      bySource.set(exp.source, list);
    }

    const partsDir = path.dirname(source.partsIndexPath!);

    for (const [sourcePath, exports] of bySource) {
      const originPartsFile = path.resolve(partsDir, `${sourcePath}.ts`);
      if (!fs.existsSync(originPartsFile)) continue;

      const originKebab = path.basename(path.dirname(originPartsFile));
      const originHtmlDir = path.join(htmlUiPath, originKebab);
      const originReactDir = path.dirname(originPartsFile);

      const originExports = extractParts(originPartsFile, program);

      for (const reExport of exports) {
        const originExport = originExports.find((o) => o.name === reExport.name);
        if (!originExport) continue;

        if (originExport.kind === 'namespace') {
          parts.push(
            ...discoverNamespaceParts(originExport, originPartsFile, originKebab, originHtmlDir, coreUiPath, program)
          );
          continue;
        }

        const kebab = partKebabFromSource(originExport.source, originKebab);

        const partElement = resolvePartElement(originHtmlDir, originKebab, originExport.source, kebab);

        const reactFile = path.join(originReactDir, `${originExport.source.replace('./', '')}.tsx`);
        const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

        const reExportUsesDataAttrs = !!reactPath && usesDataAttrs(reactPath);
        const originDataAttrsFile = path.join(coreUiPath, originKebab, 'data.ts');
        const originDataAttrsPath =
          reExportUsesDataAttrs && fs.existsSync(originDataAttrsFile) ? originDataAttrsFile : undefined;
        const originComponentName = originDataAttrsPath ? kebabToPascal(originKebab) : undefined;

        const part: PartSource = {
          name: reExport.name,
          localName: originExport.localName,
          kebab,
          isPrimary: false,
          htmlPath: partElement?.path,
          htmlElementName: partElement?.className,
          reactPath,
          dataAttrsPath: originDataAttrsPath,
          dataAttrsComponentName: originComponentName,
        };

        parts.push(part);
      }
    }
  }

  return parts.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

// A namespace re-export (`export * as Thumbnail from './thumbnail/index.parts'`) groups nested parts that render
// as `Slider.Thumbnail.Root` and `Slider.Thumbnail.Image`. The nested index sits in a folder named after the
// namespace; its `Root` maps to the element file of that name (`slider/thumbnail.ts`), other nested parts to
// `{namespace}-{part}.ts`. Nested exports may point outside the component (`../../thumbnail/image`); those parts
// take their React file, and any data attributes, from the component that owns that file.
function discoverNamespaceParts(
  namespaceExport: PartExport,
  partsIndexPath: string,
  componentKebab: string,
  htmlDir: string,
  coreUiPath: string,
  program: OxcProject
): PartSource[] {
  const nestedIndexFile = path.resolve(path.dirname(partsIndexPath), `${namespaceExport.source}.ts`);
  if (!fs.existsSync(nestedIndexFile)) return [];

  const namespaceKebab = pascalToKebab(namespaceExport.name);
  const nestedDir = path.dirname(nestedIndexFile);
  const parts: PartSource[] = [];

  for (const nestedExport of extractParts(nestedIndexFile, program)) {
    if (nestedExport.kind !== 'named') continue;

    const partKebab = partKebabFromSource(nestedExport.source, namespaceKebab);
    const elementBasename = nestedExport.name === 'Root' ? namespaceKebab : `${namespaceKebab}-${partKebab}`;
    const partElement = resolvePartElement(
      htmlDir,
      componentKebab,
      `./${namespaceKebab}/${partKebab}`,
      elementBasename
    );

    const reactFile = path.resolve(nestedDir, `${nestedExport.source}.tsx`);
    const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

    const ownerKebab = reactPath ? path.basename(path.dirname(reactPath)) : componentKebab;
    const ownerDataAttrsFile = path.join(coreUiPath, ownerKebab, 'data.ts');
    const ownsDataAttrs = !!reactPath && usesDataAttrs(reactPath) && fs.existsSync(ownerDataAttrsFile);

    parts.push({
      name: `${namespaceExport.name}.${nestedExport.name}`,
      localName: nestedExport.localName,
      kebab: `${namespaceKebab}-${partKebab}`,
      isPrimary: false,
      htmlPath: partElement?.path,
      htmlElementName: partElement?.className,
      reactPath,
      dataAttrsPath: ownsDataAttrs ? ownerDataAttrsFile : undefined,
      dataAttrsComponentName: ownsDataAttrs ? kebabToPascal(ownerKebab) : undefined,
    });
  }

  return parts.sort(
    (a, b) => Number(b.kebab === `${namespaceKebab}-root`) - Number(a.kebab === `${namespaceKebab}-root`)
  );
}

// Exactly one local part carries the shared core data and the component's root element. Several parts
// qualify when they share a source file that constructs the core; none qualifies when the React parts
// drive the core through hooks instead of constructing it. Both cases fall back to the `Root` part.
function selectPrimaryPart(parts: PartSource[], source: ComponentSource): void {
  const primaries = parts.filter((part) => part.isPrimary);
  const root = parts.find((part) => part.name === 'Root');

  const primary = primaries.length === 0 ? root : (primaries.find((part) => part.name === 'Root') ?? primaries[0]);
  if (!primary) return;

  for (const part of parts) part.isPrimary = part === primary;

  primary.htmlPath ??= source.htmlPath;
}

// ─── Component Reference Building ──────────────────────────────────

function buildSingleComponentReference(source: ComponentSource, program: OxcProject): ComponentReference | null {
  const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;
  if (!coreData) return null;

  const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;
  const cssVarsData = source.cssVarsPath ? extractCSSVars(source.cssVarsPath, program, source.name) : null;
  const htmlData = source.htmlPath ? extractHtml(source.htmlPath, program, source.name) : null;

  const result: ComponentReference = {
    name: source.name,
    description: coreData.description,
    props: buildProps(coreData),
    state: buildState(coreData),
    dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
    cssCustomProperties: cssVarsData ? buildCSSVars(cssVarsData) : {},
    platforms: {},
  };

  if (htmlData) {
    result.platforms.html = buildHtmlPlatform(htmlData);
  }

  if (result.description === undefined) delete result.description;

  return result;
}

function buildMultiPartReference(
  source: ComponentSource,
  program: OxcProject,
  parts: PartSource[]
): ComponentReference | null {
  const partsRecord: Record<string, PartReference> = {};

  for (const part of parts) {
    const description = part.reactPath
      ? (extractPartDescription(part.reactPath, program, part.localName) ??
        extractPartDescription(part.reactPath, program, part.name))
      : undefined;

    if (part.isPrimary) {
      const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;
      const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;
      const cssVarsData = source.cssVarsPath ? extractCSSVars(source.cssVarsPath, program, source.name) : null;

      const elementName = `${source.name}Element`;
      const htmlData = part.htmlPath ? extractHtml(part.htmlPath, program, source.name, elementName) : null;

      const partRef: PartReference = {
        name: part.name,
        description,
        props: coreData ? sortProps(buildProps(coreData)) : {},
        state: coreData ? buildState(coreData) : {},
        dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
        cssCustomProperties: cssVarsData ? buildCSSVars(cssVarsData) : {},
        platforms: { react: {} },
      };

      if (!partRef.description) delete partRef.description;

      if (htmlData) {
        partRef.platforms.html = buildHtmlPlatform(htmlData);
      }

      partsRecord[part.kebab] = partRef;
    } else {
      const htmlData =
        part.htmlPath && part.htmlElementName
          ? extractHtml(part.htmlPath, program, source.name, part.htmlElementName)
          : null;

      const dataAttrsData =
        part.dataAttrsPath && part.dataAttrsComponentName
          ? extractDataAttrs(part.dataAttrsPath, program, part.dataAttrsComponentName)
          : null;

      const subPartProps = part.reactPath ? extractSubPartProps(part.reactPath, program, part.localName) : {};

      if (htmlData) {
        for (const [name, prop] of Object.entries(subPartProps)) {
          if (htmlData.properties.includes(name)) prop.frameworks = ['html', 'react'];
        }
      }

      const partRef: PartReference = {
        name: part.name,
        description,
        props: sortProps(subPartProps),
        state: {},
        dataAttributes: dataAttrsData ? buildDataAttrs(dataAttrsData) : {},
        cssCustomProperties: {},
        platforms: { react: {} },
      };

      if (!partRef.description) delete partRef.description;

      if (htmlData) {
        partRef.platforms.html = buildHtmlPlatform(htmlData);
      }

      partsRecord[part.kebab] = partRef;
    }
  }

  for (const extra of source.extraDataAttrs ?? []) {
    const componentName = extra.exportName.replace(/DataAttrs$/, '');
    const extraData = extractDataAttrs(extra.path, program, componentName);

    if (!extraData) {
      log.warn(`No ${extra.exportName} export found in ${extra.path}; skipping @parts merge`);
      continue;
    }

    const extraAttrs = buildDataAttrs(extraData);

    for (const partKebab of extra.parts) {
      const partRef = partsRecord[partKebab];

      if (!partRef) {
        log.warn(`@parts in ${extra.path} references unknown part "${partKebab}" on ${source.name}`);
        continue;
      }

      partRef.dataAttributes = { ...partRef.dataAttributes, ...extraAttrs };
    }
  }

  return {
    name: source.name,
    props: {},
    state: {},
    dataAttributes: {},
    cssCustomProperties: {},
    platforms: {},
    parts: partsRecord,
  };
}

export function buildComponentReference(
  source: ComponentSource,
  program: OxcProject,
  monorepoRoot: string
): ComponentReference | null {
  if (source.partsIndexPath) {
    const parts = discoverParts(source, program, monorepoRoot);
    if (parts.length > 1) return buildMultiPartReference(source, program, parts);
  }

  if (source.extraDataAttrs?.length) {
    log.warn(`Ignoring @parts data-attrs in ${source.kebab}: ${source.name} is not a multi-part component`);
  }

  return buildSingleComponentReference(source, program);
}

// ─── Full Pipeline ─────────────────────────────────────────────────

export interface ComponentResult {
  name: string;
  kebab: string;
  reference: ComponentReference;
}

export function generateComponentReferences(monorepoRoot: string): ComponentResult[] {
  const sources = discoverComponents(monorepoRoot);
  if (sources.length === 0) return [];

  const program = createComponentProgram(sources, monorepoRoot);
  const results: ComponentResult[] = [];

  for (const source of sources) {
    const apiRef = buildComponentReference(source, program, monorepoRoot);

    if (apiRef) {
      apiRef.props = sortProps(apiRef.props);
      results.push({ name: source.name, kebab: source.kebab, reference: apiRef });
    }
  }

  return results;
}
