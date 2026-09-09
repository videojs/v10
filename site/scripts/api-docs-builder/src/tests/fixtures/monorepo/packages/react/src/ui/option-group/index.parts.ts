/**
 * Parts index whose exports all come from one source file.
 *
 * Exercises: shared-source part discovery.
 * - Root: primary by fallback (no part constructs OptionGroupCore); gets core data and the root element
 * - Options: React-only sub-part with custom props
 * - Value: React-only sub-part
 *
 * Part kebabs derive from the export names because a file-derived kebab (`component`) would collide.
 */

export {
  OptionGroupOptions as Options,
  type OptionGroupOptionsProps as OptionsProps,
  OptionGroupRoot as Root,
  type OptionGroupRootProps as RootProps,
  OptionGroupValue as Value,
  type OptionGroupValueProps as ValueProps,
} from './component';
