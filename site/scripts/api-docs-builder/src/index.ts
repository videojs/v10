import * as fs from 'node:fs';
import * as path from 'node:path';
import { kebabCase } from 'es-toolkit/string';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCore } from './core-handler.js';
import { extractDataAttrs } from './data-attrs-handler.js';
import { extractHtml } from './html-handler.js';
import {
  type ComponentApiReference,
  ComponentApiReferenceSchema,
  type ComponentSource,
  type DataAttrDef,
  type PropDef,
  type StateDef,
} from './types.js';
import { kebabToPascal, sortProps } from './utils.js';

// Magenta prefix - visible on both light and dark terminals
const PREFIX = '\x1b[35m[api-docs-builder]\x1b[0m';

const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
  success: (...args: unknown[]) => console.log(PREFIX, ...args),
};

// Paths relative to the monorepo root
const MONOREPO_ROOT = path.resolve(import.meta.dirname, '../../../../');
const CORE_UI_PATH = path.join(MONOREPO_ROOT, 'packages/core/src/core/ui');
const HTML_UI_PATH = path.join(MONOREPO_ROOT, 'packages/html/src/ui');
const OUTPUT_PATH = path.join(MONOREPO_ROOT, 'site/src/content/generated-api-reference');

/**
 * Discover all components by scanning the core/ui directory.
 */
function discoverComponents(): ComponentSource[] {
  const components: ComponentSource[] = [];

  if (!fs.existsSync(CORE_UI_PATH)) {
    log.error(`Core UI path not found: ${CORE_UI_PATH}`);
    return components;
  }

  const dirs = fs.readdirSync(CORE_UI_PATH, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const componentName = kebabToPascal(dir.name);
    const componentDir = path.join(CORE_UI_PATH, dir.name);

    // Look for core file
    const coreFile = path.join(componentDir, `${dir.name}-core.ts`);
    const dataAttrsFile = path.join(componentDir, `${dir.name}-data-attrs.ts`);

    // Look for HTML element file
    const htmlFile = path.join(HTML_UI_PATH, dir.name, `${dir.name}-element.ts`);

    const source: ComponentSource = {
      name: componentName,
    };

    if (fs.existsSync(coreFile)) {
      source.corePath = coreFile;
    }

    if (fs.existsSync(dataAttrsFile)) {
      source.dataAttrsPath = dataAttrsFile;
    }

    if (fs.existsSync(htmlFile)) {
      source.htmlPath = htmlFile;
    }

    // Only include if we have at least a core file
    if (source.corePath) {
      components.push(source);
    }
  }

  return components;
}

/**
 * Create a TypeScript program for all relevant files.
 */
function createProgram(sources: ComponentSource[]): ts.Program {
  const files: string[] = [];

  for (const source of sources) {
    if (source.corePath) files.push(source.corePath);
    if (source.dataAttrsPath) files.push(source.dataAttrsPath);
    if (source.htmlPath) files.push(source.htmlPath);
  }

  // Load base tsconfig - works for all packages since we only need type resolution
  const tsconfigPath = path.join(MONOREPO_ROOT, 'tsconfig.base.json');
  const config = tae.loadConfig(tsconfigPath);

  config.options.rootDir = MONOREPO_ROOT;

  return ts.createProgram(files, config.options);
}

/**
 * Build the API reference for a single component.
 */
function buildComponentApiReference(source: ComponentSource, program: ts.Program): ComponentApiReference | null {
  // Extract from core
  const coreData = source.corePath ? extractCore(source.corePath, program, source.name) : null;

  if (!coreData) {
    log.warn(`No core data found for ${source.name}`);
    return null;
  }

  // Extract data attributes
  const dataAttrsData = source.dataAttrsPath ? extractDataAttrs(source.dataAttrsPath, program, source.name) : null;

  // Extract HTML element info
  const htmlData = source.htmlPath ? extractHtml(source.htmlPath, program, source.name) : null;

  // Build props record
  const props: Record<string, PropDef> = {};
  for (const prop of coreData.props) {
    props[prop.name] = {
      type: prop.type,
      shortType: prop.shortType,
      description: prop.description,
      default: coreData.defaultProps[prop.name] ?? prop.default,
      required: prop.required,
    };

    // Clean up undefined values
    if (props[prop.name]!.shortType === undefined) delete props[prop.name]!.shortType;
    if (props[prop.name]!.description === undefined) delete props[prop.name]!.description;
    if (props[prop.name]!.default === undefined) delete props[prop.name]!.default;
    if (!props[prop.name]!.required) delete props[prop.name]!.required;
  }

  // Build state record
  const state: Record<string, StateDef> = {};
  for (const s of coreData.state) {
    state[s.name] = {
      type: s.type,
      description: s.description,
    };
    if (state[s.name]!.description === undefined) delete state[s.name]!.description;
  }

  // Build data attributes record
  const dataAttributes: Record<string, DataAttrDef> = {};
  if (dataAttrsData) {
    for (const attr of dataAttrsData.attrs) {
      dataAttributes[attr.name] = {
        description: attr.description,
      };
    }
  }

  // Build result
  const result: ComponentApiReference = {
    name: source.name,
    description: coreData.description,
    props,
    state,
    dataAttributes,
    platforms: {},
  };

  // Add HTML platform info if available
  if (htmlData) {
    result.platforms.html = {
      tagName: htmlData.tagName,
    };
  }

  // Clean up undefined description
  if (result.description === undefined) delete result.description;

  return result;
}

/**
 * Main entry point.
 */
function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }

  // Discover components
  const components = discoverComponents();

  if (components.length === 0) {
    log.info('No components found.');
    return;
  }
  log.info(`Found ${components.length} components. Processing...`);

  // Create TypeScript program
  const program = createProgram(components);

  // Process each component
  let successCount = 0;
  let errorCount = 0;

  for (const source of components) {
    try {
      const apiRef = buildComponentApiReference(source, program);

      if (apiRef) {
        // Sort props
        apiRef.props = sortProps(apiRef.props);

        // Validate against schema before writing
        const validated = ComponentApiReferenceSchema.safeParse(apiRef);
        if (!validated.success) {
          log.error(`Schema validation failed for ${source.name}:`);
          for (const issue of validated.error.issues) {
            log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
          }
          errorCount++;
          continue;
        }

        // Write JSON file
        const outputFile = path.join(OUTPUT_PATH, `${kebabCase(source.name)}.json`);
        const json = `${JSON.stringify(validated.data, null, 2)}\n`;
        fs.writeFileSync(outputFile, json);

        log.success(`✅ Generated ${path.basename(outputFile)}`);
        successCount++;
      }
    } catch (error) {
      log.error(`⚠️ Error processing ${source.name}:`, (error as Error).message);
      errorCount++;
    }
  }

  log.info(`Done! Generated ${successCount} files.`);

  if (errorCount > 0) {
    log.error(`${errorCount} errors occurred.`);
    process.exit(1);
  }
}

main();
