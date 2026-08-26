import {
  type BlockBody,
  collectFunctionDeclarations,
  createSourceText,
  findJsxAttribute,
  findJsxElement,
  ModuleImports,
  type Node,
  prependBlockBody,
  renderSourceRange,
  type SourceEdit,
} from '../../../vjsc/src/ast/index.ts';
import type { ComponentTargetTransform, ComponentTargetTransformContext } from '../../../vjsc/src/target/index.ts';

const optionMenus = [
  { component: 'QualityMenu', binding: 'quality', hook: 'useQualityOptions' },
  { component: 'AudioTrackMenu', binding: 'audioTrack', hook: 'useAudioTrackOptions' },
  { component: 'PlaybackRateMenu', binding: 'playbackRate', hook: 'usePlaybackRateOptions' },
  { component: 'CaptionsMenu', binding: 'captions', hook: 'useCaptionsOptions' },
] as const;

/** Add React player bindings and availability gates to skin menus. */
export const reactComponentTransform: ComponentTargetTransform = {
  name: 'videojs:react-components',
  transform(context) {
    const { code, ast } = context;
    if (!code.includes('function ')) return false;

    const imports = new ModuleImports(ast, context.magicString);

    let changed = false;

    for (const fn of collectFunctionDeclarations(ast)) {
      const name = fn.id?.name;
      if (!name || !fn.body) continue;

      changed = transformReactComponent(context, imports, name, fn.body) || changed;
    }

    if (changed) imports.commit();

    return changed;
  },
};

function transformReactComponent(
  context: ComponentTargetTransformContext,
  imports: ModuleImports,
  name: string,
  body: BlockBody
): boolean {
  const menu = optionMenus.find((candidate) => candidate.component === name);
  if (menu) return transformOptionMenu(context, imports, body, menu);

  return name === 'VideoSettingsMenu' ? transformVideoSettingsMenu(context, imports, body) : false;
}

/**
 * Bind an option menu to its player collection and omit it when unavailable.
 *
 * ```diff
 * - <Submenu selectedLabel={<span />} />
 * + available && <Submenu selectedLabel={<span>{quality?.selectedLabel}</span>} />
 * ```
 */
function transformOptionMenu(
  context: ComponentTargetTransformContext,
  imports: ModuleImports,
  body: BlockBody,
  menu: (typeof optionMenus)[number]
): true {
  const hook = imports.reference({ from: '@videojs/react', name: menu.hook });

  prependBlockBody(
    context.magicString,
    body,
    `const ${menu.binding} = ${hook}();\nconst available = ${menu.binding}?.state.availability === 'available';`
  );
  wrapElement(
    context,
    body,
    'Submenu',
    'available',
    undefined,
    createSelectedLabelBindingEdit(context.code, body, menu.binding)
  );
  return true;
}

/**
 * Hide the settings-menu trigger when every option collection is unavailable.
 *
 * ```diff
 * - <SettingsMenu />
 * + hasSettings && <SettingsMenu />
 * ```
 */
function transformVideoSettingsMenu(
  context: ComponentTargetTransformContext,
  imports: ModuleImports,
  body: BlockBody
): true {
  const bindings = optionMenus
    .map(({ binding, hook }) => {
      const reference = imports.reference({ from: '@videojs/react', name: hook });

      return `const ${binding} = ${reference}();`;
    })
    .join('\n');

  const availability = optionMenus.map(({ binding }) => `${binding}?.state.availability === 'available'`).join(' || ');

  prependBlockBody(context.magicString, body, `${bindings}\nconst hasSettings = ${availability};`);
  wrapElement(context, body, 'SettingsMenu', 'hasSettings');
  return true;
}

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

function createSelectedLabelBindingEdit(code: string, root: Node, binding: string): SourceEdit | undefined {
  const submenu = findJsxElement(root, 'Submenu');
  const selectedLabel = submenu && findJsxAttribute(submenu, 'selectedLabel');
  if (selectedLabel?.value?.type !== 'JSXExpressionContainer') return undefined;

  const value = selectedLabel.value.expression;
  if (value.type !== 'JSXElement') return undefined;

  const attributes = value.openingElement.attributes.map((attribute) => code.slice(attribute.start, attribute.end));
  const opening = `<span${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;

  return { start: value.start, end: value.end, content: `${opening}{${binding}?.selectedLabel}</span>` };
}
