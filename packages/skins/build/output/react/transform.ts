import { isJsxElement, isJsxSelfClosingElement } from 'typescript';
import {
  type CompilerPlugin,
  createJsxEditor,
  type ImportReference,
  rewrite,
  type TransformHelpers,
  type TransformStep,
} from 'vjsc';
import type { ImportRef } from 'vjsc/ast';

type ImportResolver = (reference: ImportRef) => ImportRef | false;

const optionMenus = [
  {
    component: 'QualityMenu',
    binding: 'quality',
    hook: 'useQualityOptions',
  },
  {
    component: 'AudioTrackMenu',
    binding: 'audioTrack',
    hook: 'useAudioTrackOptions',
  },
  {
    component: 'PlaybackRateMenu',
    binding: 'playbackRate',
    hook: 'usePlaybackRateOptions',
  },
  {
    component: 'CaptionsMenu',
    binding: 'captions',
    hook: 'useCaptionsOptions',
  },
] as const;

type OptionMenu = (typeof optionMenus)[number];

interface ReactImports {
  readonly usePlayer: ImportRef;
  readonly optionHooks: Readonly<Record<OptionMenu['hook'], ImportRef>>;
}

/** React-only behavior that cannot be expressed by the framework-neutral component registry. */
export function componentTransforms(resolveImport: ImportResolver): CompilerPlugin {
  const references = resolveReactImports(resolveImport);

  return rewrite((code) => {
    const usePlayer = code.import(references.usePlayer.source, references.usePlayer.name);

    const optionHooks = Object.fromEntries(
      optionMenus.map(({ hook }) => {
        const reference = references.optionHooks[hook];
        return [hook, code.import(reference.source, reference.name)];
      })
    ) as Record<OptionMenu['hook'], ImportReference>;

    return [
      ...volumeAvailabilityTransforms(code, usePlayer),
      ...optionMenus.flatMap((menu) => optionMenuTransforms(code, menu, optionHooks[menu.hook])),
      ...settingsAvailabilityTransforms(code, optionHooks),
    ];
  });
}

/**
 * Adds the React volume fallback.
 *
 * ```diff
 * + const volumeAvailability = usePlayer(...);
 * - return <Popover.Root>...</Popover.Root>;
 * + return volumeAvailability === 'available' ? <Popover.Root>...</Popover.Root> : <MuteButton />;
 * ```
 */
function volumeAvailabilityTransforms(code: TransformHelpers, usePlayer: ImportReference): readonly TransformStep[] {
  const component = code.function('VolumePopover');

  return [
    component.prepend(() =>
      code.statement.const(
        'volumeAvailability',
        code.value.call(usePlayer, [code.value.arrow(['state'], code.value.property('state', 'volumeAvailability'))])
      )
    ),
    component.jsx
      .element('$.Popover.Root')
      .replace(({ element }) =>
        code.value.conditional(
          code.value.equal('volumeAvailability', code.value.string('available')),
          element,
          code.jsx.create('MuteButton')
        )
      ),
  ];
}

/**
 * Binds one option menu to its React hook.
 *
 * ```diff
 * + const quality = useQualityOptions();
 * + const available = quality?.state.availability === 'available';
 * - return <Submenu selectedLabel={<SelectedLabel />}>...</Submenu>;
 * + return available && <Submenu selectedLabel={<span>{quality?.selectedLabel}</span>}>...</Submenu>;
 * ```
 */
function optionMenuTransforms(
  code: TransformHelpers,
  menu: OptionMenu,
  hook: ImportReference
): readonly TransformStep[] {
  const component = code.function(menu.component);

  return [
    component.prepend(() => code.statement.const(menu.binding, code.value.call(hook, []))),
    component.beforeReturn(() =>
      code.statement.const(
        'available',
        code.value.equal(
          code.value.property(code.value.optionalProperty(menu.binding, 'state'), 'availability'),
          code.value.string('available')
        )
      )
    ),
    component.jsx.element('Submenu').replace(({ element }) => code.value.and('available', element)),
    component.jsx
      .props('selectedLabel')
      .on('Submenu')
      .replace(({ value, factory }) => {
        if (!isJsxElement(value) && !isJsxSelfClosingElement(value)) return value;

        const jsx = createJsxEditor(factory);

        return jsx.apply(
          value,
          jsx.tag.replace('span'),
          jsx.children.set([jsx.create.expression(code.value.optionalProperty(menu.binding, 'selectedLabel'))])
        );
      }),
  ];
}

/**
 * Hides the aggregate settings menu when every option source is unavailable.
 *
 * ```diff
 * + const quality = useQualityOptions();
 * + const hasSettings = quality?.state.availability === 'available' || ...;
 * - return <SettingsMenu />;
 * + return hasSettings && <SettingsMenu />;
 * ```
 */
function settingsAvailabilityTransforms(
  code: TransformHelpers,
  hooks: Readonly<Record<OptionMenu['hook'], ImportReference>>
): readonly TransformStep[] {
  const component = code.function('VideoSettingsMenu');

  return [
    component.prepend(() =>
      optionMenus.map(({ binding, hook }) => code.statement.const(binding, code.value.call(hooks[hook], [])))
    ),
    component.beforeReturn(() =>
      code.statement.const(
        'hasSettings',
        optionMenus
          .map(({ binding }) =>
            code.value.equal(
              code.value.property(code.value.optionalProperty(binding, 'state'), 'availability'),
              code.value.string('available')
            )
          )
          .reduceRight((right, left) => code.value.or(left, right))
      )
    ),
    component.jsx.element('SettingsMenu').replace(({ element }) => code.value.and('hasSettings', element)),
  ];
}

function resolveReactImports(resolveImport: ImportResolver): ReactImports {
  return {
    usePlayer: requiredReactImport(resolveImport, 'usePlayer'),
    optionHooks: Object.fromEntries(
      optionMenus.map(({ hook }) => [hook, requiredReactImport(resolveImport, hook)])
    ) as Record<OptionMenu['hook'], ImportRef>,
  };
}

function requiredReactImport(resolveImport: ImportResolver, name: string): ImportRef {
  const reference = resolveImport({ source: '@videojs/react', name });
  if (!reference) throw new Error(`React Skin output requires a target import for \`${name}\`.`);
  return reference;
}
