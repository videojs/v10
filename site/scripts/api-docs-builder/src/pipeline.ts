/**
 * Testable pipeline functions for the API docs builder.
 *
 * Extracted from index.ts so that E2E tests can run the full pipeline
 * against a fixture monorepo by passing a custom root path.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCore } from './core-handler.js';
import { extractCSSVars } from './css-vars-handler.js';
import { extractDataAttrs } from './data-attrs-handler.js';
import { abbreviateType } from './formatter.js';
import { extractHtml } from './html-handler.js';
import { extractPartDescription, extractParts, extractSubPartProps } from './parts-handler.js';
import type {
  ComponentReference,
  ComponentSource,
  CoreExtraction,
  CSSVarDef,
  CSSVarsExtraction,
  DataAttrDef,
  DataAttrsExtraction,
  PartReference,
  PartSource,
  PropDef,
  StateDef,
} from './types.js';
import { kebabToPascal, partKebabFromSource, sortProps } from './utils.js';

// ─── Overrides ─────────────────────────────────────────────────────

// Components whose PascalCase name doesn't match simple kebab-to-pascal conversion.
export const NAME_OVERRIDES: Record<string, string> = {
  'pip-button': 'PiPButton',
};

// Parts whose HTML element file doesn't follow the `{component}-{part}-element.ts` convention.
// Key: `{component}/{part-kebab}`, Value: element file basename (without `.ts`).
export const PART_ELEMENT_OVERRIDES: Record<string, string> = {
  'tooltip/provider': 'tooltip-group-element',
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

// ─── Discovery ─────────────────────────────────────────────────────

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

    const coreFile = path.join(componentDir, `${dir.name}-core.ts`);
    const dataAttrsFile = path.join(componentDir, `${dir.name}-data-attrs.ts`);
    const cssVarsFile = path.join(componentDir, `${dir.name}-css-vars.ts`);
    const htmlFile = path.join(htmlUiPath, dir.name, `${dir.name}-element.ts`);

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

    if (source.corePath) {
      components.push(source);
    }
  }

  return components;
}

// ─── Program Creation ──────────────────────────────────────────────

export function createComponentProgram(sources: ComponentSource[], monorepoRoot: string): ts.Program {
  const htmlUiPath = path.join(monorepoRoot, 'packages/html/src/ui');
  const coreUiPath = path.join(monorepoRoot, 'packages/core/src/core/ui');
  const files: string[] = [];

  for (const source of sources) {
    if (source.corePath) files.push(source.corePath);
    if (source.dataAttrsPath) files.push(source.dataAttrsPath);
    if (source.cssVarsPath) files.push(source.cssVarsPath);
    if (source.htmlPath) files.push(source.htmlPath);
    if (source.partsIndexPath) files.push(source.partsIndexPath);

    if (source.partsIndexPath) {
      const htmlDir = path.join(htmlUiPath, source.kebab);
      if (fs.existsSync(htmlDir)) {
        const elementFiles = fs.readdirSync(htmlDir).filter((f) => f.endsWith('-element.ts'));
        for (const file of elementFiles) {
          const fullPath = path.join(htmlDir, file);
          if (!files.includes(fullPath)) {
            files.push(fullPath);
          }
        }
      }

      const reactDir = path.dirname(source.partsIndexPath);
      const reactFiles = fs.readdirSync(reactDir).filter((f) => f.endsWith('.tsx'));
      for (const file of reactFiles) {
        const fullPath = path.join(reactDir, file);
        if (!files.includes(fullPath)) {
          files.push(fullPath);
        }
      }

      const partsSource = fs.readFileSync(source.partsIndexPath, 'utf-8');
      const nonLocalImports = partsSource.match(/from\s+['"]([^.][^'"]*)['"]/g);
      if (nonLocalImports) {
        for (const match of nonLocalImports) {
          const importPath = match.replace(/from\s+['"]/, '').replace(/['"]$/, '');
          const originDir = path.resolve(path.dirname(source.partsIndexPath), importPath, '..');
          const originKebab = path.basename(originDir);

          const originHtmlDir = path.join(htmlUiPath, originKebab);
          if (fs.existsSync(originHtmlDir)) {
            const originElementFiles = fs.readdirSync(originHtmlDir).filter((f) => f.endsWith('-element.ts'));
            for (const file of originElementFiles) {
              const fullPath = path.join(originHtmlDir, file);
              if (!files.includes(fullPath)) {
                files.push(fullPath);
              }
            }
          }

          if (fs.existsSync(originDir)) {
            const originReactFiles = fs.readdirSync(originDir).filter((f) => f.endsWith('.tsx'));
            for (const file of originReactFiles) {
              const fullPath = path.join(originDir, file);
              if (!files.includes(fullPath)) {
                files.push(fullPath);
              }
            }
          }
        }
      }
    }
  }

  const tsconfigPath = path.join(monorepoRoot, 'tsconfig.base.json');
  const config = tae.loadConfig(tsconfigPath);
  config.options.rootDir = monorepoRoot;

  return ts.createProgram(files, config.options);
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

export function discoverParts(source: ComponentSource, program: ts.Program, monorepoRoot: string): PartSource[] {
  if (!source.partsIndexPath) return [];

  const htmlUiPath = path.join(monorepoRoot, 'packages/html/src/ui');
  const coreUiPath = path.join(monorepoRoot, 'packages/core/src/core/ui');

  const partExports = extractParts(source.partsIndexPath, program);
  if (partExports.length === 0) return [];

  const localExports = partExports.filter((p) => p.source.startsWith('./'));
  const nonLocalExports = partExports.filter((p) => !p.source.startsWith('./'));

  if (localExports.length === 0 && nonLocalExports.length === 0) return [];

  const componentKebab = source.kebab;
  const htmlDir = path.join(htmlUiPath, componentKebab);

  const parts: PartSource[] = [];

  for (const partExport of localExports) {
    const kebab = partKebabFromSource(partExport.source, componentKebab);

    const overrideKey = `${componentKebab}/${kebab}`;
    const elementBasename = PART_ELEMENT_OVERRIDES[overrideKey] ?? `${componentKebab}-${kebab}-element`;
    const subPartElementFile = path.join(htmlDir, `${elementBasename}.ts`);
    const hasSubPartElement = fs.existsSync(subPartElementFile);

    const reactFile = path.join(path.dirname(source.partsIndexPath!), `${partExport.source.replace('./', '')}.tsx`);
    const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

    const isPrimary = !!reactPath && instantiatesCore(reactPath, source.name);

    const subPartUsesDataAttrs = !isPrimary && !!reactPath && usesDataAttrs(reactPath);

    const part: PartSource = {
      name: partExport.name,
      localName: partExport.localName,
      kebab,
      isPrimary,
      htmlPath: hasSubPartElement ? subPartElementFile : isPrimary ? source.htmlPath : undefined,
      reactPath,
      dataAttrsPath: subPartUsesDataAttrs ? source.dataAttrsPath : undefined,
      dataAttrsComponentName: subPartUsesDataAttrs ? source.name : undefined,
    };

    parts.push(part);
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

        const kebab = partKebabFromSource(originExport.source, originKebab);

        const subPartElementFile = path.join(originHtmlDir, `${originKebab}-${kebab}-element.ts`);
        const hasSubPartElement = fs.existsSync(subPartElementFile);

        const reactFile = path.join(originReactDir, `${originExport.source.replace('./', '')}.tsx`);
        const reactPath = fs.existsSync(reactFile) ? reactFile : undefined;

        const reExportUsesDataAttrs = !!reactPath && usesDataAttrs(reactPath);
        const originDataAttrsFile = path.join(coreUiPath, originKebab, `${originKebab}-data-attrs.ts`);
        const originDataAttrsPath =
          reExportUsesDataAttrs && fs.existsSync(originDataAttrsFile) ? originDataAttrsFile : undefined;
        const originComponentName = originDataAttrsPath ? kebabToPascal(originKebab) : undefined;

        const part: PartSource = {
          name: reExport.name,
          localName: originExport.localName,
          kebab,
          isPrimary: false,
          htmlPath: hasSubPartElement ? subPartElementFile : undefined,
          reactPath,
          dataAttrsPath: originDataAttrsPath,
          dataAttrsComponentName: originComponentName,
        };

        parts.push(part);
      }
    }
  }

  const primaryCount = parts.filter((p) => p.isPrimary).length;
  if (primaryCount > 1) {
    let foundFirst = false;
    for (const p of parts) {
      if (p.isPrimary) {
        if (foundFirst) p.isPrimary = false;
        foundFirst = true;
      }
    }
  }

  return parts.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

// ─── Component Reference Building ──────────────────────────────────

function buildSingleComponentReference(source: ComponentSource, program: ts.Program): ComponentReference | null {
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
    result.platforms.html = { tagName: htmlData.tagName };
  }

  if (result.description === undefined) delete result.description;

  return result;
}

function buildMultiPartReference(
  source: ComponentSource,
  program: ts.Program,
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
        partRef.platforms.html = { tagName: htmlData.tagName };
      }

      partsRecord[part.kebab] = partRef;
    } else {
      const elementName = part.htmlPath ? kebabToPascal(path.basename(part.htmlPath, '.ts')) : undefined;
      const htmlData =
        part.htmlPath && elementName ? extractHtml(part.htmlPath, program, source.name, elementName) : null;

      const dataAttrsData =
        part.dataAttrsPath && part.dataAttrsComponentName
          ? extractDataAttrs(part.dataAttrsPath, program, part.dataAttrsComponentName)
          : null;

      const subPartProps = part.reactPath ? extractSubPartProps(part.reactPath, program, part.localName) : {};

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
        partRef.platforms.html = { tagName: htmlData.tagName };
      }

      partsRecord[part.kebab] = partRef;
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
  program: ts.Program,
  monorepoRoot: string
): ComponentReference | null {
  if (source.partsIndexPath) {
    const parts = discoverParts(source, program, monorepoRoot);
    if (parts.length > 1) {
      return buildMultiPartReference(source, program, parts);
    }
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
