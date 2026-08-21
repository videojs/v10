import type { JSXElement, JSXElementName, Node, Function as OxcFunction, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin, RolldownMagicString } from 'rolldown';

const optionMenus = [
  { component: 'QualityMenu', binding: 'quality', hook: 'useQualityOptions' },
  { component: 'AudioTrackMenu', binding: 'audioTrack', hook: 'useAudioTrackOptions' },
  { component: 'PlaybackRateMenu', binding: 'playbackRate', hook: 'usePlaybackRateOptions' },
  { component: 'CaptionsMenu', binding: 'captions', hook: 'useCaptionsOptions' },
] as const;

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export function createReactBehaviorPlugins(): readonly Plugin[] {
  return [reactBehaviorBindingsPlugin(), reactBehaviorAvailabilityPlugin()];
}

function reactBehaviorBindingsPlugin(): Plugin {
  return {
    name: 'videojs:react-behavior-bindings',
    transform: {
      filter: { id: SCRIPT_ID, code: 'function ' },
      handler(code, id, transform) {
        if (!isReactTarget(id) || !transform.ast || !transform.magicString) return null;

        const imports = new Set<string>();
        let changed = false;

        for (const fn of functions(transform.ast)) {
          const name = fn.id?.name;
          if (!name || !fn.body) continue;

          if (name === 'VolumePopover') {
            imports.add('usePlayer');
            insertBodyStart(
              transform.magicString,
              fn,
              `const volumeAvailability = usePlayer(state => state.volumeAvailability);`
            );
            changed = true;
            continue;
          }

          const menu = optionMenus.find((candidate) => candidate.component === name);
          if (menu) {
            imports.add(menu.hook);
            insertBodyStart(
              transform.magicString,
              fn,
              `const ${menu.binding} = ${menu.hook}();\nconst available = ${menu.binding}?.state.availability === 'available';`
            );
            rewriteSelectedLabel(code, transform.magicString, fn, menu.binding);
            changed = true;
            continue;
          }

          if (name === 'VideoSettingsMenu') {
            for (const menu of optionMenus) imports.add(menu.hook);
            const bindings = optionMenus.map(({ binding, hook }) => `const ${binding} = ${hook}();`).join('\n');
            const availability = optionMenus
              .map(({ binding }) => `${binding}?.state.availability === 'available'`)
              .join(' || ');
            insertBodyStart(transform.magicString, fn, `${bindings}\nconst hasSettings = ${availability};`);
            changed = true;
          }
        }

        if (!changed) return null;
        insertReactImport(transform.ast, transform.magicString, imports);
        return { code: transform.magicString };
      },
    },
  };
}

function reactBehaviorAvailabilityPlugin(): Plugin {
  return {
    name: 'videojs:react-behavior-availability',
    transform: {
      filter: { id: SCRIPT_ID, code: 'return' },
      handler(code, id, transform) {
        if (!isReactTarget(id) || !transform.ast || !transform.magicString) return null;
        let changed = false;

        for (const fn of functions(transform.ast)) {
          const name = fn.id?.name;
          if (!name || !fn.body) continue;

          const menu = optionMenus.find((candidate) => candidate.component === name);
          const target =
            name === 'VolumePopover'
              ? '$.Popover.Root'
              : menu
                ? 'Submenu'
                : name === 'VideoSettingsMenu'
                  ? 'SettingsMenu'
                  : undefined;
          if (!target) continue;

          const element = findJsxElement(fn.body, target);
          if (!element) continue;
          const source = code.slice(element.start, element.end);
          const replacement =
            name === 'VolumePopover'
              ? `volumeAvailability === 'available' ? ${source} : <MuteButton />`
              : `${name === 'VideoSettingsMenu' ? 'hasSettings' : 'available'} && ${source}`;

          transform.magicString.overwrite(element.start, element.end, replacement);
          changed = true;
        }

        return changed ? { code: transform.magicString } : null;
      },
    },
  };
}

function rewriteSelectedLabel(code: string, magicString: RolldownMagicString, fn: OxcFunction, binding: string): void {
  if (!fn.body) return;
  const submenu = findJsxElement(fn.body, 'Submenu');
  const selectedLabel = submenu?.openingElement.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name === 'selectedLabel'
  );
  if (selectedLabel?.type !== 'JSXAttribute' || selectedLabel.value?.type !== 'JSXExpressionContainer') return;
  const value = selectedLabel.value.expression;
  if (value.type !== 'JSXElement') return;

  const attributes = value.openingElement.attributes.map((attribute) => code.slice(attribute.start, attribute.end));
  const opening = `<span${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;
  magicString.overwrite(value.start, value.end, `${opening}{${binding}?.selectedLabel}</span>`);
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

function isReactTarget(id: string): boolean {
  const query = id.slice(id.indexOf('?') + 1);
  return new URLSearchParams(query).get('target') === 'react';
}
