import {
  collectFunctionDeclarations,
  createSourceText,
  findJsxAttribute,
  findJsxElement,
  ModuleImports,
  type Node,
  prependBlockBody,
  renderSourceRange,
  type SourceEdit,
} from 'vjsc/ast';
import type { ComponentTargetTransform, ComponentTargetTransformContext } from 'vjsc/target';

const optionMenus = [
  { component: 'QualityMenu', binding: 'quality', hook: 'useQualityOptions' },
  { component: 'AudioTrackMenu', binding: 'audioTrack', hook: 'useAudioTrackOptions' },
  { component: 'PlaybackRateMenu', binding: 'playbackRate', hook: 'usePlaybackRateOptions' },
  { component: 'CaptionsMenu', binding: 'captions', hook: 'useCaptionsOptions' },
] as const;

/** Add React player bindings and availability gates to skin controls and menus. */
export const reactComponentTransform: ComponentTargetTransform = {
  name: 'videojs:react-components',
  transform(context) {
    const { code, ast, magicString } = context;

    if (!code.includes('function ')) return false;

    const imports = new ModuleImports(ast, magicString);

    let changed = false;

    for (const fn of collectFunctionDeclarations(ast)) {
      const name = fn.id?.name;
      if (!name || !fn.body) continue;

      if (name === 'VolumePopover') {
        const usePlayer = imports.reference({ from: '@videojs/react', name: 'usePlayer' });
        prependBlockBody(
          magicString,
          fn.body,
          `const volumeAvailability = ${usePlayer}(state => state.volumeAvailability);`
        );
        wrapElement(context, fn.body, '$.Popover.Root', `volumeAvailability === 'available'`, '<MuteButton />');
        changed = true;
        continue;
      }

      const menu = optionMenus.find((candidate) => candidate.component === name);
      if (menu) {
        const hook = imports.reference({ from: '@videojs/react', name: menu.hook });
        prependBlockBody(
          magicString,
          fn.body,
          `const ${menu.binding} = ${hook}();\nconst available = ${menu.binding}?.state.availability === 'available';`
        );
        wrapElement(
          context,
          fn.body,
          'Submenu',
          'available',
          undefined,
          selectedLabelEdit(code, fn.body, menu.binding)
        );
        changed = true;
        continue;
      }

      if (name === 'VideoSettingsMenu') {
        const bindings = optionMenus
          .map(({ binding, hook }) => {
            const reference = imports.reference({ from: '@videojs/react', name: hook });
            return `const ${binding} = ${reference}();`;
          })
          .join('\n');

        const availability = optionMenus
          .map(({ binding }) => `${binding}?.state.availability === 'available'`)
          .join(' || ');

        prependBlockBody(magicString, fn.body, `${bindings}\nconst hasSettings = ${availability};`);
        wrapElement(context, fn.body, 'SettingsMenu', 'hasSettings');

        changed = true;
      }
    }

    if (changed) imports.commit();
    return changed;
  },
};

function wrapElement(
  context: ComponentTargetTransformContext,
  root: Node,
  expected: string,
  condition: string,
  fallback?: string,
  nestedEdit?: SourceEdit
): void {
  const { code, magicString } = context;
  const element = findJsxElement(root, expected);
  if (!element) {
    if (nestedEdit) magicString.overwrite(nestedEdit.start, nestedEdit.end, nestedEdit.content);
    return;
  }

  const source = renderSourceRange(
    createSourceText(code, nestedEdit ? [nestedEdit] : []),
    element.start,
    element.end
  ).value;

  const replacement = fallback ? `${condition} ? ${source} : ${fallback}` : `${condition} && ${source}`;

  magicString.overwrite(element.start, element.end, replacement);
}

function selectedLabelEdit(code: string, root: Node, binding: string): SourceEdit | undefined {
  const submenu = findJsxElement(root, 'Submenu');
  const selectedLabel = submenu && findJsxAttribute(submenu, 'selectedLabel');
  if (selectedLabel?.value?.type !== 'JSXExpressionContainer') {
    return undefined;
  }
  const value = selectedLabel.value.expression;
  if (value.type !== 'JSXElement') return undefined;

  const attributes = value.openingElement.attributes.map((attribute) => code.slice(attribute.start, attribute.end));
  const opening = `<span${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;
  return { start: value.start, end: value.end, content: `${opening}{${binding}?.selectedLabel}</span>` };
}
