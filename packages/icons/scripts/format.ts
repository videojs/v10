import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CustomPlugin, XastElement } from 'svgo';
import { optimize } from 'svgo';

import {
  ASSETS_DIR,
  createSvgoConfig,
  getIconSets,
  getSvgFiles,
  PRESET_DEFAULT_OVERRIDES,
  REMOVE_ATTRS_PLUGIN,
  replaceColors,
} from './shared.js';

const SHAPES = new Set(['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect']);

function allShapesUseCurrentColor(node: XastElement, inheritedFill: string): boolean {
  for (const child of node.children) {
    if (child.type !== 'element') continue;

    const effectiveFill = child.attributes.fill ?? inheritedFill;

    if (SHAPES.has(child.name)) {
      if (effectiveFill !== 'currentColor') return false;
    } else if (!allShapesUseCurrentColor(child, effectiveFill)) {
      return false;
    }
  }
  return true;
}

function hasShapeDescendant(node: XastElement): boolean {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (SHAPES.has(child.name) || hasShapeDescendant(child)) return true;
  }
  return false;
}

function removeFillCurrentColor(node: XastElement): void {
  if (node.attributes.fill === 'currentColor') {
    delete node.attributes.fill;
  }
  for (const child of node.children) {
    if (child.type === 'element') removeFillCurrentColor(child);
  }
}

/**
 * When the root `<svg>` has `fill="none"` but every shape descendant uses
 * `fill="currentColor"` (directly or inherited from a `<g>`), hoist
 * `fill="currentColor"` to the root and strip it from descendants.
 *
 * With `multipass: true`, SVGO's `collapseGroups` will then clean up any
 * `<g>` elements left with no attributes on the next pass.
 */
const hoistCurrentColorFill: CustomPlugin = {
  name: 'hoistCurrentColorFill',
  fn: () => ({
    element: {
      exit(node) {
        if (node.name !== 'svg') return;
        if (node.attributes.fill !== 'none') return;
        if (!hasShapeDescendant(node)) return;
        if (!allShapesUseCurrentColor(node, 'none')) return;

        node.attributes.fill = 'currentColor';

        for (const child of node.children) {
          if (child.type === 'element') removeFillCurrentColor(child);
        }
      },
    },
  }),
};

const SVGO_CONFIG = createSvgoConfig(
  [
    {
      name: 'preset-default',
      params: {
        overrides: {
          ...PRESET_DEFAULT_OVERRIDES,
          convertShapeToPath: false,
        },
      },
    },
    REMOVE_ATTRS_PLUGIN,
    hoistCurrentColorFill,
  ],
  {
    js2svg: {
      indent: 2,
      pretty: true,
    },
  }
);

function formatFile(filePath: string): boolean {
  const input = readFileSync(filePath, 'utf8');
  const formatted = replaceColors(optimize(input, SVGO_CONFIG).data);

  if (formatted !== input) {
    writeFileSync(filePath, formatted);
    return true;
  }

  return false;
}

function getAllSvgFiles(): string[] {
  return getIconSets().flatMap((set) => getSvgFiles(set).map((file) => join(ASSETS_DIR, set, file)));
}

const files = process.argv.length > 2 ? process.argv.slice(2) : getAllSvgFiles();

let changed = 0;

for (const file of files) {
  if (formatFile(file)) {
    console.log(`  formatted: ${file}`);
    changed++;
  }
}

if (changed > 0) {
  console.log(`\nFormatted ${changed} of ${files.length} SVG files.`);
}
