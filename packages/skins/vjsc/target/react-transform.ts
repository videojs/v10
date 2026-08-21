import type { JSXElement, JSXElementName, Node, Function as OxcFunction, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { RolldownMagicString } from 'rolldown';
import type { ComponentTargetTransform } from 'vjsc/target';

const optionMenus = [
  { component: 'QualityMenu', binding: 'quality', hook: 'useQualityOptions' },
  { component: 'AudioTrackMenu', binding: 'audioTrack', hook: 'useAudioTrackOptions' },
  { component: 'PlaybackRateMenu', binding: 'playbackRate', hook: 'usePlaybackRateOptions' },
  { component: 'CaptionsMenu', binding: 'captions', hook: 'useCaptionsOptions' },
] as const;

interface SourceEdit {
  readonly start: number;
  readonly end: number;
  readonly content: string;
}

/** Add React player bindings and availability gates to skin controls and menus. */
export const reactComponentTransform: ComponentTargetTransform = {
  name: 'videojs:react-components',
  transform({ code, ast, magicString }) {
    if (!code.includes('function ')) return false;

    const imports = new Set<string>();
    let changed = false;

    for (const fn of functions(ast)) {
      const name = fn.id?.name;
      if (!name || !fn.body) continue;

      if (name === 'VolumePopover') {
        imports.add('usePlayer');
        insertBodyStart(magicString, fn, `const volumeAvailability = usePlayer(state => state.volumeAvailability);`);
        wrapElement(code, magicString, fn, '$.Popover.Root', `volumeAvailability === 'available'`, '<MuteButton />');
        changed = true;
        continue;
      }

      const menu = optionMenus.find((candidate) => candidate.component === name);
      if (menu) {
        imports.add(menu.hook);
        insertBodyStart(
          magicString,
          fn,
          `const ${menu.binding} = ${menu.hook}();\nconst available = ${menu.binding}?.state.availability === 'available';`
        );
        wrapElement(
          code,
          magicString,
          fn,
          'Submenu',
          'available',
          undefined,
          selectedLabelEdit(code, fn, menu.binding)
        );
        changed = true;
        continue;
      }

      if (name === 'VideoSettingsMenu') {
        for (const option of optionMenus) imports.add(option.hook);
        const bindings = optionMenus.map(({ binding, hook }) => `const ${binding} = ${hook}();`).join('\n');
        const availability = optionMenus
          .map(({ binding }) => `${binding}?.state.availability === 'available'`)
          .join(' || ');
        insertBodyStart(magicString, fn, `${bindings}\nconst hasSettings = ${availability};`);
        wrapElement(code, magicString, fn, 'SettingsMenu', 'hasSettings');
        changed = true;
      }
    }

    if (changed) insertReactImport(ast, magicString, imports);
    return changed;
  },
};

function wrapElement(
  code: string,
  magicString: RolldownMagicString,
  fn: OxcFunction,
  expected: string,
  condition: string,
  fallback?: string,
  nestedEdit?: SourceEdit
): void {
  if (!fn.body) return;
  const element = findJsxElement(fn.body, expected);
  if (!element) {
    if (nestedEdit) magicString.overwrite(nestedEdit.start, nestedEdit.end, nestedEdit.content);
    return;
  }

  const source = nestedEdit ? applyNestedEdit(code, element, nestedEdit) : code.slice(element.start, element.end);
  const replacement = fallback ? `${condition} ? ${source} : ${fallback}` : `${condition} && ${source}`;
  magicString.overwrite(element.start, element.end, replacement);
}

function applyNestedEdit(code: string, element: JSXElement, edit: SourceEdit): string {
  const source = code.slice(element.start, element.end);
  const start = edit.start - element.start;
  const end = edit.end - element.start;

  if (start < 0 || end > source.length) return source;
  return `${source.slice(0, start)}${edit.content}${source.slice(end)}`;
}

function selectedLabelEdit(code: string, fn: OxcFunction, binding: string): SourceEdit | undefined {
  if (!fn.body) return undefined;
  const submenu = findJsxElement(fn.body, 'Submenu');
  const selectedLabel = submenu?.openingElement.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name === 'selectedLabel'
  );
  if (selectedLabel?.type !== 'JSXAttribute' || selectedLabel.value?.type !== 'JSXExpressionContainer') {
    return undefined;
  }
  const value = selectedLabel.value.expression;
  if (value.type !== 'JSXElement') return undefined;

  const attributes = value.openingElement.attributes.map((attribute) => code.slice(attribute.start, attribute.end));
  const opening = `<span${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;
  return { start: value.start, end: value.end, content: `${opening}{${binding}?.selectedLabel}</span>` };
}

function insertBodyStart(magicString: RolldownMagicString, fn: OxcFunction, source: string): void {
  if (!fn.body) return;
  magicString.appendLeft(fn.body.start + 1, `\n${source}\n`);
}

function insertReactImport(ast: Program, magicString: RolldownMagicString, names: ReadonlySet<string>): void {
  if (names.size === 0) return;
  const existing = new Set<string>();

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || statement.source.value !== '@videojs/react') continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportSpecifier') existing.add(specifier.local.name);
    }
  }

  const requested = [...names].filter((name) => !existing.has(name));
  if (requested.length === 0) return;
  const insertion = ast.body[0]?.start ?? 0;
  magicString.appendLeft(insertion, `import { ${requested.join(', ')} } from '@videojs/react';\n`);
}

function functions(ast: Program): OxcFunction[] {
  const output: OxcFunction[] = [];
  walk(ast, {
    enter(node) {
      if (node.type === 'FunctionDeclaration') output.push(node);
    },
  });
  return output;
}

function findJsxElement(node: Node, expected: string): JSXElement | undefined {
  let found: JSXElement | undefined;
  walk(node, {
    enter(candidate) {
      if (found || candidate.type !== 'JSXElement') return;
      if (jsxName(candidate.openingElement.name) === expected) {
        found = candidate;
        this.skip();
      }
    },
  });
  return found;
}

function jsxName(name: JSXElementName): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') return '';
  return `${jsxName(name.object)}.${name.property.name}`;
}
