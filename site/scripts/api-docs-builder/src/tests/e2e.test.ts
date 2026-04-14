/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                    API DOCS BUILDER — END-TO-END SPEC                      │
 * │                                                                            │
 * │  This file IS the specification for the API docs builder pipeline.         │
 * │  It exercises every pattern the builder must handle, using a mock          │
 * │  monorepo under fixtures/monorepo/. If you're an agent trying to          │
 * │  understand how the builder works: read this file. The fixtures are        │
 * │  the inputs, the expected JSON objects are the outputs.                    │
 * │                                                                            │
 * │  The builder is a black box: given TypeScript source files following       │
 * │  specific conventions, it produces JSON reference objects. These tests     │
 * │  verify the contract between input conventions and output shape.           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * FIXTURE LAYOUT (under fixtures/monorepo/):
 *
 * Components (packages/core/src/core/ui/):
 *   toggle-button/  — Single-part component. Exercises: props, state, data-attrs,
 *                     CSS vars, defaultProps, HTML element, type abbreviation,
 *                     @ignore skipping, ref auto-skip, function-typed props.
 *   gauge/          — Multi-part component. Exercises: primary part detection via
 *                     Core instantiation, sub-parts with/without HTML elements,
 *                     React-only parts (no platforms.html), sub-part data-attr
 *                     inheritance (stateAttrMap heuristic), non-boolean type
 *                     inference (number, string literal union via type alias).
 *   slider/         — Base multi-part component. Exercises: base component whose
 *                     parts are re-exported by domain variants.
 *   volume-slider/  — Domain variant. Exercises: re-exported parts from slider,
 *                     origin-based element + data-attr resolution, re-exported
 *                     parts are never primary, always multi-part (no fallback).
 *
 * Utils (already existing fixtures for hooks, controllers, selectors, etc.):
 *   Exercises: hook discovery, controller discovery, @public context,
 *   create* factory, mixin display name stripping, selector discovery,
 *   @label overloads, slug collision (react vs html create-player),
 *   framework assignment.
 *
 * Features (packages/core/src/dom/store/features/):
 *   playback.ts  — Simple feature. Exercises: boolean state properties,
 *                  void/Promise action methods, JSDoc description extraction.
 *   volume.ts    — Complex feature. Exercises: numeric state, type alias
 *                  (MediaFeatureAvailability), methods with params + returns,
 *                  interface-level JSDoc → feature description.
 *   presets.ts   — Feature bundles. Exercises: plural *Features naming
 *                  (filtered out of feature discovery), array resolution
 *                  for preset feature lists.
 *   feature.parts.ts — Short aliases (playbackFeature as playback, etc.).
 *                  Exercises: namespace re-export filtering (export * as features).
 *   index.ts     — Re-export barrel. Exercises: feature discovery filtering
 *                  (singular *Feature only, not *Features or namespaces).
 *
 * Presets:
 *   HTML (packages/html/src/presets/):
 *     video.ts   — Exercises: feature bundle export, multiple HTML skins
 *                  (SkinElement inheritance), tailwind skin exclusion.
 *     audio.ts   — Exercises: single skin, subset of features.
 *   React (packages/react/src/presets/):
 *     video/     — Exercises: feature bundle, React skins (*Skin naming),
 *                  media element export, tailwind skin exclusion.
 *     audio/     — Exercises: single skin, different media element.
 *
 * Media elements (packages/html/src/define/media/ + packages/core/src/dom/media/):
 *   simple-video  — Simple media element. Exercises: discovery via static
 *                   tagName in define/media/*.ts, minimal host (src rw,
 *                   engine readonly), shared attributes/events/CSS vars
 *                   from custom-media-element, slots parsed from template HTML.
 *   complex-video — Complex media element. Exercises: host with JSDoc
 *                   descriptions, multiple property types (string, boolean,
 *                   Record), host-vs-native attribute deduplication
 *                   (src, preload in host → omitted from nativeAttributes).
 *   extending-video — Extending media element. Exercises: host inheritance
 *                   (ExtendingHost extends ComplexHost). Builder must
 *                   walk the extends chain to include inherited properties.
 *                   Child overrides (debug) replace parent definitions.
 *   container.ts  — Exclusion case. Not a media element — re-exports an
 *                   existing class instead of declaring one inline.
 *   background-video.ts — Exclusion case. Uses MediaAttachMixin(HTMLElement)
 *                   without CustomMediaElement. API reference manually maintained.
 */
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type FeatureResult,
  generateComponentReferences,
  generateFeatureReferences,
  generateMediaElementReferences,
  generatePresetReferences,
  type MediaElementResult,
  type PresetResult,
} from '../pipeline';
import { getUtilEntries, type UtilEntry } from '../util-handler';

const FIXTURE_ROOT = path.resolve(import.meta.dirname, 'fixtures/monorepo');

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT PIPELINE
// ═══════════════════════════════════════════════════════════════════════

describe('Component pipeline (end-to-end)', () => {
  // Run the full pipeline once and reuse results across tests.
  const results = generateComponentReferences(FIXTURE_ROOT);

  function findComponent(name: string) {
    return results.find((r) => r.name === name);
  }

  // ─────────────────────────────────────────────────────────────────
  // SINGLE-PART COMPONENT: ToggleButton
  // ─────────────────────────────────────────────────────────────────
  //
  // A single-part component is the simplest case. The builder merges
  // data from three source files into one flat reference object:
  //   - Core file → Props interface, State interface, defaultProps
  //   - Data-attrs file → data attribute names + JSDoc descriptions
  //   - CSS-vars file → CSS custom property names + descriptions
  //   - HTML element file → tagName for platforms.html
  //
  // Key behaviors tested:
  //   - Props with `@ignore` JSDoc are excluded from output
  //   - Props named `ref` are auto-excluded (React internal)
  //   - Function-typed props get abbreviated ("function") with detailedType
  //   - Union props with function members get "type | function" abbreviation
  //   - defaultProps values are merged as string representations
  //   - Boolean data-attrs have NO type field (presence/absence convention)
  //   - CSS custom properties appear in cssCustomProperties
  //   - platforms.html is present when an HTML element file exists
  //   - No `parts` field on single-part components

  describe('ToggleButton (single-part)', () => {
    it('produces the expected JSON reference', () => {
      const toggle = findComponent('ToggleButton');
      expect(toggle).toBeDefined();

      const ref = toggle!.reference;

      // Top-level shape
      expect(ref.name).toBe('ToggleButton');
      expect(ref.parts).toBeUndefined();

      // ── Props ──
      // `ref` prop is auto-skipped. `_internalFlag` has @ignore and is skipped.
      // What remains: disabled, label, onPressedChange.
      expect(Object.keys(ref.props)).toEqual(expect.arrayContaining(['disabled', 'label', 'onPressedChange']));
      expect(ref.props['ref' as keyof typeof ref.props]).toBeUndefined();
      expect(ref.props['_internalFlag' as keyof typeof ref.props]).toBeUndefined();

      // disabled: simple boolean, has defaultProps value.
      // Props that are non-optional in the interface have required: true,
      // even when they have a runtime default (defaultProps is separate from optionality).
      expect(ref.props.disabled).toEqual({
        type: 'boolean',
        description: 'Whether the button is disabled.',
        default: 'false',
        required: true,
      });

      // label: union with function → abbreviated to "string | function"
      // defaultProps '' → "''"
      expect(ref.props.label).toMatchObject({
        type: 'string | function',
        description: 'Custom label for the button.',
        default: "''",
      });
      // detailedType shows the full function signature
      expect(ref.props.label!.detailedType).toBeDefined();
      expect(ref.props.label!.detailedType).toContain('=>');

      // onPressedChange: pure function → abbreviated to "function"
      expect(ref.props.onPressedChange).toMatchObject({
        type: 'function',
        description: 'Callback when pressed state changes.',
      });
      expect(ref.props.onPressedChange!.detailedType).toBeDefined();

      // ── State ──
      expect(ref.state.pressed).toEqual({
        type: 'boolean',
        description: 'Whether the toggle is pressed.',
      });
      expect(ref.state.disabled).toEqual({
        type: 'boolean',
        description: 'Whether the button is disabled.',
      });

      // ── Data attributes ──
      // Boolean state types → type field is OMITTED (presence/absence convention).
      expect(ref.dataAttributes['data-pressed']).toEqual({
        description: 'Present when the toggle is pressed.',
      });
      expect(ref.dataAttributes['data-disabled']).toEqual({
        description: 'Present when the button is disabled.',
      });

      // ── CSS custom properties ──
      expect(ref.cssCustomProperties['--media-toggle-pressed-bg']).toEqual({
        description: 'Background color when pressed.',
      });
      expect(ref.cssCustomProperties['--media-toggle-transition']).toEqual({
        description: 'Transition duration for the toggle animation.',
      });

      // ── Platforms ──
      // HTML element exists → platforms.html with tagName
      expect(ref.platforms.html).toEqual({ tagName: 'media-toggle-button' });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // MULTI-PART COMPONENT: Gauge
  // ─────────────────────────────────────────────────────────────────
  //
  // A multi-part component is detected when `index.parts.ts` exists
  // in the React package. The top-level reference has EMPTY props,
  // state, dataAttributes, cssCustomProperties, and platforms. All
  // meaningful data lives in the `parts` record.
  //
  // Parts are discovered from index.parts.ts exports:
  //   - PRIMARY PART: The part whose React source instantiates the
  //     component's own Core class (matches `new {Name}Core\b`).
  //     Gets: shared core Props/State, data-attrs, CSS vars, root tagName.
  //   - SUB-PARTS: All other parts. Get: their own tagName (if element
  //     file exists), description from React JSDoc, shared data-attrs
  //     (only if React source references `stateAttrMap`), and custom
  //     React props from `{LocalName}Props` interface.
  //   - REACT-ONLY PARTS: Sub-parts with no matching HTML element file.
  //     Get platforms.react but NOT platforms.html.
  //
  // Non-boolean data-attr types are inferred from StateAttrMap<State>:
  //   - number → type: "number"
  //   - string literal union → type: "'empty' | 'partial' | 'full'"
  //   - type alias → expanded to literals (FillLevel → 'empty' | ...)
  //   - boolean → type field OMITTED

  describe('Gauge (multi-part)', () => {
    it('has empty top-level and parts record', () => {
      const gauge = findComponent('Gauge');
      expect(gauge).toBeDefined();

      const ref = gauge!.reference;

      // Top-level is empty for multi-part components
      expect(ref.props).toEqual({});
      expect(ref.state).toEqual({});
      expect(ref.dataAttributes).toEqual({});
      expect(ref.cssCustomProperties).toEqual({});
      expect(ref.platforms).toEqual({});

      // Parts record exists
      expect(ref.parts).toBeDefined();
      expect(Object.keys(ref.parts!)).toEqual(expect.arrayContaining(['indicator', 'track', 'fill', 'label']));
    });

    it('primary part (Indicator) gets core props, state, data-attrs, CSS vars', () => {
      const parts = findComponent('Gauge')!.reference.parts!;
      const indicator = parts.indicator!;

      expect(indicator.name).toBe('Indicator');
      expect(indicator.description).toBe('A visual indicator for the current value. Renders a `<span>` element.');

      // Props from shared core (GaugeProps), with defaultProps merged
      expect(indicator.props.min).toMatchObject({ type: 'number', default: '0' });
      expect(indicator.props.max).toMatchObject({ type: 'number', default: '100' });
      expect(indicator.props.label).toMatchObject({
        type: 'string | function',
        default: "''",
      });

      // State from shared core (GaugeState)
      expect(indicator.state.percentage).toMatchObject({
        type: 'number',
        description: 'Current value as a percentage (0\u20131).',
      });

      // Data attributes with non-boolean type inference
      expect(indicator.dataAttributes['data-percentage']).toMatchObject({
        description: 'Current percentage as a string.',
        type: 'number',
      });
      expect(indicator.dataAttributes['data-fill-level']).toMatchObject({
        description: 'The fill level.',
      });
      // FillLevel type alias → expanded to string literal union
      const fillType = indicator.dataAttributes['data-fill-level']!.type;
      expect(fillType).toBeDefined();
      expect(fillType).toContain("'empty'");
      expect(fillType).toContain("'partial'");
      expect(fillType).toContain("'full'");

      // CSS vars from shared css-vars file
      expect(indicator.cssCustomProperties['--media-gauge-fill']).toEqual({
        description: 'The fill color of the gauge.',
      });

      // Platforms: both html and react
      expect(indicator.platforms.html).toEqual({ tagName: 'media-gauge' });
      expect(indicator.platforms.react).toEqual({});
    });

    it('sub-part (Track) gets its own tagName, empty props/state', () => {
      const track = findComponent('Gauge')!.reference.parts!.track!;

      expect(track.name).toBe('Track');
      expect(track.description).toBe('The track area of the gauge. Renders a `<div>` element.');
      expect(track.props).toEqual({});
      expect(track.state).toEqual({});
      expect(track.dataAttributes).toEqual({});
      expect(track.cssCustomProperties).toEqual({});

      // Has both HTML and React platforms
      expect(track.platforms.html).toEqual({ tagName: 'media-gauge-track' });
      expect(track.platforms.react).toEqual({});
    });

    it('sub-part (Fill) inherits shared data-attrs via stateAttrMap heuristic', () => {
      const fill = findComponent('Gauge')!.reference.parts!.fill!;

      expect(fill.name).toBe('Fill');
      // Sub-part custom React props: extracted from `FillProps` interface.
      // `children` is auto-excluded by the builder.
      expect(fill.props.color).toMatchObject({ type: 'string' });
      expect(fill.props.children).toBeUndefined();
      expect(fill.state).toEqual({});

      // Fill's React source references `stateAttrMap`, so it gets the
      // component's shared data-attrs from gauge-data-attrs.ts
      expect(Object.keys(fill.dataAttributes).length).toBeGreaterThan(0);
      expect(fill.dataAttributes['data-percentage']).toBeDefined();
      expect(fill.dataAttributes['data-fill-level']).toBeDefined();

      expect(fill.platforms.html).toEqual({ tagName: 'media-gauge-fill' });
      expect(fill.platforms.react).toEqual({});
    });

    it('React-only sub-part (Label) has no platforms.html', () => {
      const label = findComponent('Gauge')!.reference.parts!.label!;

      expect(label.name).toBe('Label');
      expect(label.description).toBe('An accessible label for the gauge value. Renders a `<span>` element.');

      // React-only: has platforms.react but NOT platforms.html
      expect(label.platforms.react).toEqual({});
      expect(label.platforms.html).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // MULTI-PART WITH RE-EXPORTS: VolumeSlider
  // ─────────────────────────────────────────────────────────────────
  //
  // Domain variant components like VolumeSlider re-export parts from
  // a base component (Slider). The builder resolves re-exports:
  //   - Parses the origin's index.parts.ts to find the original export
  //   - Derives element file paths from the ORIGIN component
  //   - Data-attrs come from the ORIGIN component's data-attrs file
  //   - Re-exported parts are NEVER primary
  //   - Components with re-exported parts always produce multi-part
  //     output (no single-part fallback, even if only 1 local export)

  describe('VolumeSlider (multi-part with re-exports)', () => {
    it('has empty top-level and parts from both local and re-exported sources', () => {
      const vs = findComponent('VolumeSlider');
      expect(vs).toBeDefined();

      const ref = vs!.reference;
      expect(ref.props).toEqual({});
      expect(ref.state).toEqual({});
      expect(ref.parts).toBeDefined();

      // Root is local, Thumb and Track are re-exported from slider
      expect(ref.parts!.root).toBeDefined();
      expect(ref.parts!.thumb).toBeDefined();
      expect(ref.parts!.track).toBeDefined();
    });

    it('local primary part (Root) gets VolumeSlider core data', () => {
      const root = findComponent('VolumeSlider')!.reference.parts!.root!;

      expect(root.name).toBe('Root');
      // Props come from VolumeSliderProps
      expect(root.props.orientation).toBeDefined();
      // State comes from VolumeSliderState
      expect(root.state.volume).toBeDefined();
      // HTML tag comes from volume-slider-element.ts
      expect(root.platforms.html).toEqual({ tagName: 'media-volume-slider' });
      expect(root.platforms.react).toEqual({});
    });

    it('re-exported sub-part (Thumb) resolves from slider origin', () => {
      const thumb = findComponent('VolumeSlider')!.reference.parts!.thumb!;

      expect(thumb.name).toBe('Thumb');
      // HTML tag comes from SLIDER's element file (slider-thumb-element.ts),
      // not volume-slider's directory
      expect(thumb.platforms.html).toEqual({ tagName: 'media-slider-thumb' });
      expect(thumb.platforms.react).toEqual({});

      // Data-attrs come from SLIDER's data-attrs file because the origin
      // React source (slider-thumb.tsx) references stateAttrMap
      expect(Object.keys(thumb.dataAttributes).length).toBeGreaterThan(0);
      expect(thumb.dataAttributes['data-value']).toBeDefined();
      expect(thumb.dataAttributes['data-dragging']).toBeDefined();
    });

    it('re-exported sub-part (Track) with no stateAttrMap gets empty data-attrs', () => {
      const track = findComponent('VolumeSlider')!.reference.parts!.track!;

      expect(track.name).toBe('Track');
      // slider-track.tsx does NOT reference stateAttrMap, so no data-attrs
      expect(track.dataAttributes).toEqual({});
      // HTML tag from slider's track element
      expect(track.platforms.html).toEqual({ tagName: 'media-slider-track' });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BASE COMPONENT: Slider
  // ─────────────────────────────────────────────────────────────────
  //
  // The slider base is also discovered as its own component.
  // It has index.parts.ts with 3 local parts (Root, Thumb, Track).
  // This tests that the base component is independently valid.

  describe('Slider (base multi-part)', () => {
    it('is discovered and has parts', () => {
      const slider = findComponent('Slider');
      expect(slider).toBeDefined();

      const ref = slider!.reference;
      expect(ref.parts).toBeDefined();

      // Root is primary (instantiates SliderCore)
      expect(ref.parts!.root).toBeDefined();
      expect(ref.parts!.root!.props.min).toBeDefined();
      expect(ref.parts!.root!.props.max).toBeDefined();
      expect(ref.parts!.root!.state.value).toBeDefined();
      expect(ref.parts!.root!.state.dragging).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CROSS-CUTTING CONVENTIONS
  // ─────────────────────────────────────────────────────────────────

  describe('Cross-cutting conventions', () => {
    it('all components are discovered from core/ui directories', () => {
      const names = results.map((r) => r.name).sort();
      expect(names).toEqual(expect.arrayContaining(['Gauge', 'PiPButton', 'Slider', 'ToggleButton', 'VolumeSlider']));
    });

    it('kebab name matches directory name', () => {
      expect(findComponent('ToggleButton')!.kebab).toBe('toggle-button');
      expect(findComponent('Gauge')!.kebab).toBe('gauge');
      expect(findComponent('Slider')!.kebab).toBe('slider');
      expect(findComponent('VolumeSlider')!.kebab).toBe('volume-slider');
    });

    it('NAME_OVERRIDES: pip-button → PiPButton (not PipButton)', () => {
      // The NAME_OVERRIDES map handles cases where standard kebab-to-PascalCase
      // conversion is wrong. "pip-button" would normally become "PipButton",
      // but the override maps it to "PiPButton".
      const pip = findComponent('PiPButton');
      expect(pip).toBeDefined();
      expect(pip!.kebab).toBe('pip-button');
      expect(pip!.reference.name).toBe('PiPButton');
      // Props use the overridden name for interface lookup (PiPButtonProps)
      expect(pip!.reference.props.disabled).toBeDefined();
      expect(pip!.reference.state.active).toBeDefined();
    });

    it('primary part appears first in parts record (sorted by isPrimary)', () => {
      const gaugeParts = Object.keys(findComponent('Gauge')!.reference.parts!);
      expect(gaugeParts[0]).toBe('indicator');

      const vsParts = Object.keys(findComponent('VolumeSlider')!.reference.parts!);
      expect(vsParts[0]).toBe('root');
    });

    it('props are sorted: required first, then alphabetical', () => {
      // All ToggleButton props are required (non-optional in the interface),
      // so they should be purely alphabetical within the required group.
      const toggleProps = Object.keys(findComponent('ToggleButton')!.reference.props);
      const sorted = [...toggleProps].sort((a, b) => a.localeCompare(b));
      expect(toggleProps).toEqual(sorted);
    });

    it('optional fields are omitted from JSON when undefined', () => {
      const ref = findComponent('ToggleButton')!.reference;

      // disabled has no detailedType (simple boolean, no abbreviation)
      expect('detailedType' in ref.props.disabled!).toBe(false);

      // Boolean data-attrs have no type field
      expect('type' in ref.dataAttributes['data-pressed']!).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UTIL PIPELINE
// ═══════════════════════════════════════════════════════════════════════
//
// The util pipeline scans fixed entry points for exports matching
// naming conventions (use*, select*, create*, *Controller) or @public
// JSDoc. Each export produces a UtilReference JSON with overloads.
//
// Key behaviors:
//   - Hooks (use*): discovered from React entry points, framework: "react"
//   - Controllers (*Controller): discovered from HTML entry points, framework: "html"
//   - Selectors (select*): framework-agnostic (null)
//   - Factories (create*): framework depends on entry point
//   - @public exports: explicit inclusion regardless of naming
//   - create*Mixin: display name strips "create" prefix
//   - Slug collisions: React keeps bare slug, HTML gets prefixed with "html-"
//   - Multi-overload functions: each overload is preserved in the overloads array
//   - @label JSDoc: becomes the overload's label field
//   - Controller params: "- " prefix stripped from @param descriptions

describe('Util pipeline (end-to-end)', () => {
  const entries = getUtilEntries(FIXTURE_ROOT);

  function findByName(name: string, framework?: 'react' | 'html' | null): UtilEntry | undefined {
    return entries.find((e) => e.data.name === name && (framework === undefined || e.framework === framework));
  }

  // ─────────────────────────────────────────────────────────────────
  // DISCOVERY & FRAMEWORK ASSIGNMENT
  // ─────────────────────────────────────────────────────────────────
  //
  // Exports are discovered by scanning entry point files and their
  // local re-exports. The framework is determined by which entry
  // point the export was found in.

  describe('Discovery', () => {
    it('discovers hooks from React entry points', () => {
      expect(findByName('usePlayer', 'react')).toBeDefined();
      expect(findByName('useStore', 'react')).toBeDefined();
      expect(findByName('useFormat', 'react')).toBeDefined();
    });

    it('discovers controllers from HTML entry points', () => {
      expect(findByName('PlayerController', 'html')).toBeDefined();
      expect(findByName('SnapshotController', 'html')).toBeDefined();
    });

    it('discovers selectors as framework-agnostic (null)', () => {
      for (const name of ['selectPlayback', 'selectVolume', 'selectTime']) {
        const entry = findByName(name, null);
        expect(entry, `expected ${name} to be framework-agnostic`).toBeDefined();
        expect(entry!.framework).toBeNull();
      }
    });

    it('discovers @public exports (mergeProps, playerContext)', () => {
      expect(findByName('mergeProps', 'react')).toBeDefined();
      expect(findByName('playerContext', 'html')).toBeDefined();
    });

    it('discovers factories from both React and HTML', () => {
      expect(findByName('createPlayer', 'react')).toBeDefined();
      expect(findByName('createPlayer', 'html')).toBeDefined();
      expect(findByName('createSelector', null)).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DISPLAY NAME & SLUG
  // ─────────────────────────────────────────────────────────────────
  //
  // Display names are the export name as-is, EXCEPT create*Mixin
  // factories which strip the "create" prefix.
  // Slugs are kebab-case of the display name. On collision, React
  // keeps the bare slug and HTML gets "html-" prefixed.

  describe('Display name & slug', () => {
    it('strips "create" prefix from mixin display names', () => {
      const mixin = findByName('ContainerMixin', 'html');
      expect(mixin).toBeDefined();
      expect(mixin!.slug).toBe('container-mixin');
    });

    it('resolves slug collisions: React bare, HTML prefixed', () => {
      const reactCreate = entries.find((e) => e.slug === 'create-player' && e.framework === 'react');
      const htmlCreate = entries.find((e) => e.slug === 'html-create-player' && e.framework === 'html');

      expect(reactCreate).toBeDefined();
      expect(htmlCreate).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // OVERLOADS
  // ─────────────────────────────────────────────────────────────────
  //
  // When a function or constructor has multiple signatures, each
  // becomes a separate entry in the overloads array.
  // @label JSDoc tags on overload signatures become the label field.

  describe('Overloads', () => {
    it('preserves multiple overload signatures', () => {
      const usePlayer = findByName('usePlayer', 'react');
      expect(usePlayer!.data.overloads.length).toBe(2);

      const useStore = findByName('useStore', 'react');
      expect(useStore!.data.overloads.length).toBe(2);
    });

    it('extracts @label from overload JSDoc', () => {
      const useFormat = findByName('useFormat', 'react');
      expect(useFormat!.data.overloads[0]!.label).toBe('Number');
      expect(useFormat!.data.overloads[1]!.label).toBe('String');
    });

    it('omits label when @label is absent', () => {
      const useStore = findByName('useStore', 'react');
      expect(useStore!.data.overloads[0]!.label).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EXTRACTION SHAPE
  // ─────────────────────────────────────────────────────────────────
  //
  // Each util reference has: name, description?, overloads[].
  // Each overload has: label?, description?, parameters, returnValue.
  // Parameters and returnValue follow the same PropDef/StateDef shape
  // used by component references.

  describe('Extraction shape', () => {
    it('hooks have description and overloads with parameters + returnValue', () => {
      const usePlayer = findByName('usePlayer', 'react');
      expect(usePlayer!.data.description).toBeDefined();

      const overload = usePlayer!.data.overloads[0]!;
      expect(overload.returnValue).toBeDefined();
      expect(overload.returnValue.type).toBeDefined();
    });

    it('controllers have constructor params and public members as returnValue.fields', () => {
      const snapshot = findByName('SnapshotController', 'html');
      expect(snapshot!.data.description).toBeDefined();

      const overload = snapshot!.data.overloads[0]!;
      // Constructor parameters
      expect(overload.parameters.host).toBeDefined();

      // Return value type includes class name with type params
      expect(overload.returnValue.type).toContain('SnapshotController');

      // Public members as fields
      expect(overload.returnValue.fields).toBeDefined();
      expect(overload.returnValue.fields!.value).toBeDefined();
      expect(overload.returnValue.fields!.track).toBeDefined();
    });

    it('controller param descriptions have "- " prefix stripped', () => {
      const snapshot = findByName('SnapshotController', 'html');
      const hostParam = snapshot!.data.overloads[0]!.parameters.host;
      expect(hostParam!.description).toBe('The host element.');
      expect(hostParam!.description).not.toMatch(/^-\s/);
    });

    it('contexts (@public non-function) have empty parameters and type as returnValue', () => {
      const ctx = findByName('playerContext', 'html');
      expect(ctx!.data.description).toBeDefined();

      const overload = ctx!.data.overloads[0]!;
      expect(overload.parameters).toEqual({});
      expect(overload.returnValue.type).toBeDefined();
    });

    it('selectors have parameters and returnValue', () => {
      const sel = findByName('selectPlayback', null);
      expect(sel!.data.description).toBeDefined();

      const overload = sel!.data.overloads[0]!;
      expect(Object.keys(overload.parameters).length).toBeGreaterThan(0);
      expect(overload.returnValue.type).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FEATURE PIPELINE
// ═══════════════════════════════════════════════════════════════════════
//
// Features are defined via `definePlayerFeature()` and discovered from
// the features index. Each feature's state interface is split into two
// records: `state` (non-method properties) and `actions` (methods).
//
// Key behaviors:
//   - Discovery: singular *Feature exports from the features index
//   - Filtering: plural *Features (feature bundles) are excluded
//   - State extraction: interface properties → state record
//   - Action extraction: interface methods → actions record
//   - JSDoc: member descriptions flow through, interface-level JSDoc
//     becomes the feature description
//   - Type aliases: expanded in the output (MediaFeatureAvailability →
//     'available' | 'unavailable' | 'unsupported')
//   - Slug: derived from feature name, used for cross-linking from presets

describe('Feature pipeline (end-to-end)', () => {
  const results = generateFeatureReferences(FIXTURE_ROOT);

  function findFeature(name: string): FeatureResult | undefined {
    return results.find((r) => r.name === name);
  }

  // ─────────────────────────────────────────────────────────────────
  // DISCOVERY
  // ─────────────────────────────────────────────────────────────────

  describe('Discovery', () => {
    it('discovers features from the features index', () => {
      const names = results.map((r) => r.name);
      expect(names).toContain('playback');
      expect(names).toContain('volume');
    });

    it('excludes feature bundles (plural *Features)', () => {
      const names = results.map((r) => r.name);
      expect(names).not.toContain('videoFeatures');
      expect(names).not.toContain('audioFeatures');
    });

    it('excludes namespace re-exports (export * as features)', () => {
      const names = results.map((r) => r.name);
      expect(names).not.toContain('features');
    });

    it('produces one result per feature', () => {
      expect(results.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PLAYBACK FEATURE (simple: booleans + void methods)
  // ─────────────────────────────────────────────────────────────────
  //
  // MediaPlaybackState has:
  //   - paused: boolean (state)
  //   - ended: boolean (state)
  //   - play(): Promise<void> (action)
  //   - pause(): void (action)
  // No interface-level JSDoc → no feature description.

  describe('playback (simple feature)', () => {
    it('has name and slug', () => {
      const playback = findFeature('playback');
      expect(playback).toBeDefined();
      expect(playback!.slug).toBe('playback');
      expect(playback!.reference.name).toBe('playback');
      expect(playback!.reference.slug).toBe('playback');
    });

    it('has no description (no interface-level JSDoc)', () => {
      const ref = findFeature('playback')!.reference;
      expect(ref.description).toBeUndefined();
    });

    it('extracts boolean properties as state', () => {
      const state = findFeature('playback')!.reference.state;
      expect(state.paused).toEqual({
        type: 'boolean',
        description: 'Whether playback is paused.',
      });
      expect(state.ended).toEqual({
        type: 'boolean',
        description: 'Whether playback has reached the end.',
      });
    });

    it('extracts methods as actions', () => {
      const actions = findFeature('playback')!.reference.actions;

      expect(actions.play).toBeDefined();
      expect(actions.play!.type).toContain('Promise');
      expect(actions.play!.description).toBe('Start playback.');

      expect(actions.pause).toBeDefined();
      expect(actions.pause!.type).toContain('void');
      expect(actions.pause!.description).toBe('Pause playback.');
    });

    it('does not mix state and actions', () => {
      const ref = findFeature('playback')!.reference;
      // Methods should not appear in state
      expect(ref.state['play' as keyof typeof ref.state]).toBeUndefined();
      expect(ref.state['pause' as keyof typeof ref.state]).toBeUndefined();
      // Properties should not appear in actions
      expect(ref.actions['paused' as keyof typeof ref.actions]).toBeUndefined();
      expect(ref.actions['ended' as keyof typeof ref.actions]).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // VOLUME FEATURE (complex: types, params, returns, description)
  // ─────────────────────────────────────────────────────────────────
  //
  // MediaVolumeState has interface-level JSDoc → feature description.
  //   - volume: number (state)
  //   - muted: boolean (state)
  //   - volumeAvailability: MediaFeatureAvailability (state, type alias)
  //   - setVolume(volume: number): number (action with param + return)
  //   - toggleMuted(): boolean (action with return)

  describe('volume (complex feature)', () => {
    it('has description from interface-level JSDoc', () => {
      const ref = findFeature('volume')!.reference;
      expect(ref.description).toBe('Controls audio volume and mute state.');
    });

    it('extracts state with various types', () => {
      const state = findFeature('volume')!.reference.state;

      expect(state.volume).toMatchObject({
        type: 'number',
        description: 'Volume level from 0 (silent) to 1 (max).',
      });

      expect(state.muted).toMatchObject({
        type: 'boolean',
        description: 'Whether audio is muted.',
      });
    });

    it('expands type aliases in state', () => {
      const state = findFeature('volume')!.reference.state;
      // MediaFeatureAvailability should be expanded to the union
      const avail = state.volumeAvailability!;
      expect(avail.type).toContain("'available'");
      expect(avail.type).toContain("'unavailable'");
      expect(avail.type).toContain("'unsupported'");
    });

    it('extracts actions with parameters and return types', () => {
      const actions = findFeature('volume')!.reference.actions;

      // setVolume has a parameter and returns a number
      expect(actions.setVolume).toBeDefined();
      expect(actions.setVolume!.type).toContain('number');
      expect(actions.setVolume!.description).toBe('Set volume (clamped 0-1). Returns the clamped value.');

      // toggleMuted returns a boolean
      expect(actions.toggleMuted).toBeDefined();
      expect(actions.toggleMuted!.type).toContain('boolean');
      expect(actions.toggleMuted!.description).toBe('Toggle mute state. Returns the new muted value.');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PRESET PIPELINE
// ═══════════════════════════════════════════════════════════════════════
//
// Presets bundle features, skins, and media elements for a specific use
// case. They are discovered from directories under packages/{html,react}/
// src/presets/.
//
// Key behaviors:
//   - Discovery: directories under both HTML and React preset paths
//   - Feature bundle: *Features export → resolved to list of feature names
//   - HTML skins: classes extending SkinElement, with tagName
//   - React skins: exports matching *Skin naming
//   - Media element: React exports that aren't bundles or skins
//   - Tailwind exclusion: .tailwind files/exports are filtered out
//   - HTML media element: implied by preset name (video → <video>)

describe('Preset pipeline (end-to-end)', () => {
  const results = generatePresetReferences(FIXTURE_ROOT);

  function findPreset(name: string): PresetResult | undefined {
    return results.find((r) => r.name === name);
  }

  // ─────────────────────────────────────────────────────────────────
  // DISCOVERY
  // ─────────────────────────────────────────────────────────────────

  describe('Discovery', () => {
    it('discovers presets from preset directories', () => {
      const names = results.map((r) => r.name).sort();
      expect(names).toEqual(['audio', 'video']);
    });

    it('produces one result per preset', () => {
      expect(results.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // VIDEO PRESET (full: multiple skins, tailwind exclusion)
  // ─────────────────────────────────────────────────────────────────

  describe('video preset', () => {
    it('identifies the feature bundle', () => {
      const ref = findPreset('video')!.reference;
      expect(ref.featureBundle).toBe('videoFeatures');
    });

    it('resolves feature names from the bundle', () => {
      const ref = findPreset('video')!.reference;
      expect(ref.features).toEqual(expect.arrayContaining(['playback', 'volume']));
      expect(ref.features.length).toBe(2);
    });

    it('detects HTML skins with tagNames', () => {
      const skins = findPreset('video')!.reference.html.skins;
      expect(skins).toEqual(
        expect.arrayContaining([
          { name: 'VideoSkinElement', tagName: 'video-skin' },
          { name: 'MinimalVideoSkinElement', tagName: 'video-minimal-skin' },
        ])
      );
    });

    it('excludes HTML tailwind skins', () => {
      const skinNames = findPreset('video')!.reference.html.skins.map((s) => s.name);
      expect(skinNames).not.toContain('VideoSkinTailwindElement');
    });

    it('detects React skins', () => {
      const skins = findPreset('video')!.reference.react.skins;
      expect(skins).toEqual(expect.arrayContaining([{ name: 'VideoSkin' }, { name: 'MinimalVideoSkin' }]));
    });

    it('excludes React tailwind skins', () => {
      const skinNames = findPreset('video')!.reference.react.skins.map((s) => s.name);
      expect(skinNames).not.toContain('VideoSkinTailwind');
    });

    it('detects React media element', () => {
      const ref = findPreset('video')!.reference;
      expect(ref.react.mediaElement).toBe('Video');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // AUDIO PRESET (minimal: single skin, subset of features)
  // ─────────────────────────────────────────────────────────────────

  describe('audio preset', () => {
    it('identifies the feature bundle', () => {
      const ref = findPreset('audio')!.reference;
      expect(ref.featureBundle).toBe('audioFeatures');
    });

    it('resolves feature names (subset of video)', () => {
      const ref = findPreset('audio')!.reference;
      expect(ref.features).toEqual(['playback']);
    });

    it('detects single HTML skin', () => {
      const skins = findPreset('audio')!.reference.html.skins;
      expect(skins).toEqual([{ name: 'AudioSkinElement', tagName: 'audio-skin' }]);
    });

    it('detects single React skin', () => {
      const skins = findPreset('audio')!.reference.react.skins;
      expect(skins).toEqual([{ name: 'AudioSkin' }]);
    });

    it('detects React media element', () => {
      const ref = findPreset('audio')!.reference;
      expect(ref.react.mediaElement).toBe('Audio');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // CROSS-CUTTING: feature links
  // ─────────────────────────────────────────────────────────────────

  describe('Cross-cutting', () => {
    it('feature names in presets match feature reference slugs', () => {
      const featureResults = generateFeatureReferences(FIXTURE_ROOT);
      const featureSlugs = featureResults.map((r) => r.slug);

      const videoPreset = findPreset('video')!.reference;
      for (const featureName of videoPreset.features) {
        expect(featureSlugs).toContain(featureName);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MEDIA ELEMENT PIPELINE
// ═══════════════════════════════════════════════════════════════════════
//
// Media elements are custom elements that wrap native <video>/<audio> with
// streaming hosts (HLS, DASH, etc.). They are discovered from
// packages/html/src/define/media/*.ts by looking for files that declare a
// class with `static tagName`.
//
// The builder extracts:
//   - Tag name from the element class's static tagName
//   - Host properties by following the CustomMediaElement(tag, Host) call to the
//     host class and walking its getter/setter pairs
//   - Shared native attributes from static properties, events, and CSS vars
//   - Slots parsed from the template HTML (getVideoTemplateHTML / getCommonTemplateHTML)
//   - JSDoc descriptions from host getter/setter pairs
//
// Key behaviors:
//   - Discovery: files in define/media/ with an inline class declaration + static tagName
//   - Exclusion: container.ts (re-exports, no inline class), background-video.ts
//     (no CustomMediaElement — uses MediaAttachMixin(HTMLElement) directly)
//   - Host inheritance: child host extends parent, builder walks the chain
//   - Deduplication: properties in the host that overlap with native attributes
//     (e.g., src, preload) appear in hostProperties and are omitted from nativeAttributes

describe('Media element pipeline (end-to-end)', () => {
  const results = generateMediaElementReferences(FIXTURE_ROOT);

  function findElement(name: string): MediaElementResult | undefined {
    return results.find((r) => r.name === name);
  }

  // ─────────────────────────────────────────────────────────────────
  // DISCOVERY
  // ─────────────────────────────────────────────────────────────────

  describe('Discovery', () => {
    it('discovers media elements from define/media/ files', () => {
      const names = results.map((r) => r.name).sort();
      expect(names).toEqual(['ComplexVideo', 'ExtendingVideo', 'SimpleVideo']);
    });

    it('excludes container (re-export, not inline class declaration)', () => {
      expect(findElement('MediaContainer')).toBeUndefined();
      expect(findElement('MediaContainerElement')).toBeUndefined();
    });

    it('excludes background-video (no CustomMediaElement, manually maintained)', () => {
      expect(findElement('BackgroundVideo')).toBeUndefined();
      expect(findElement('BackgroundVideoElement')).toBeUndefined();
    });

    it('produces one result per media element', () => {
      expect(results.length).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // SIMPLE MEDIA ELEMENT: SimpleVideo
  // ─────────────────────────────────────────────────────────────────
  //
  // A minimal media element with a simple host (src rw, engine readonly).
  // No JSDoc on host properties — descriptions should be undefined.
  // No overlap between host props and native attributes (engine is not
  // in static properties), so nativeAttributes should be the full shared list.

  describe('SimpleVideo (minimal host)', () => {
    it('extracts the tag name', () => {
      const ref = findElement('SimpleVideo')!.reference;
      expect(ref.tagName).toBe('simple-video');
    });

    it('extracts host properties with types and readonly flags', () => {
      const props = findElement('SimpleVideo')!.reference.hostProperties;

      // src: read-write string
      expect(props.src).toMatchObject({
        type: 'string',
        readonly: false,
      });
      expect(props.src.description).toBeUndefined();

      // engine: readonly object
      expect(props.engine).toMatchObject({
        type: 'object',
        readonly: true,
      });
    });

    it('excludes host lifecycle methods (attach, detach, destroy)', () => {
      const props = findElement('SimpleVideo')!.reference.hostProperties;
      expect(props.attach).toBeUndefined();
      expect(props.detach).toBeUndefined();
      expect(props.destroy).toBeUndefined();
    });

    it('includes native attributes from static properties', () => {
      const ref = findElement('SimpleVideo')!.reference;
      // src is in the host, so it should be omitted from nativeAttributes
      expect(ref.nativeAttributes).toEqual(
        expect.arrayContaining([
          'autoplay',
          'controls',
          'crossorigin',
          'loop',
          'muted',
          'playsinline',
          'poster',
          'preload',
        ])
      );
      expect(ref.nativeAttributes).not.toContain('src');
    });

    it('includes standard media events', () => {
      const ref = findElement('SimpleVideo')!.reference;
      expect(ref.events).toEqual(
        expect.arrayContaining([
          'abort',
          'canplay',
          'durationchange',
          'ended',
          'pause',
          'play',
          'timeupdate',
          'volumechange',
        ])
      );
    });

    it('includes CSS custom properties from VideoCSSVars', () => {
      const css = findElement('SimpleVideo')!.reference.cssCustomProperties;
      expect(css['--media-object-fit']).toEqual({
        description: 'Object fit for the video.',
      });
      expect(css['--media-video-border-radius']).toEqual({
        description: 'Border radius of the video element.',
      });
    });

    it('includes slots parsed from the video template HTML', () => {
      const ref = findElement('SimpleVideo')!.reference;
      expect(ref.slots).toEqual(expect.arrayContaining(['media', '']));
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // COMPLEX MEDIA ELEMENT: ComplexVideo
  // ─────────────────────────────────────────────────────────────────
  //
  // A full media element with a complex host that has JSDoc descriptions,
  // multiple property types, and overlap with native attributes (src, preload).
  // Tests that the builder extracts descriptions from JSDoc on getters and
  // deduplicates host props from nativeAttributes.

  describe('ComplexVideo (full host, JSDoc, deduplication)', () => {
    it('extracts the tag name', () => {
      const ref = findElement('ComplexVideo')!.reference;
      expect(ref.tagName).toBe('complex-video');
    });

    it('extracts all host properties', () => {
      const props = findElement('ComplexVideo')!.reference.hostProperties;
      const propNames = Object.keys(props).sort();
      expect(propNames).toEqual(['config', 'debug', 'engine', 'preferPlayback', 'preload', 'src', 'type']);
    });

    it('extracts JSDoc descriptions from host getters', () => {
      const props = findElement('ComplexVideo')!.reference.hostProperties;
      expect(props.type.description).toBe('Explicit source type. When unset, inferred from the source URL extension.');
      expect(props.preferPlayback.description).toBe("Whether to prefer `'mse'` or `'native'` playback.");
      expect(props.debug.description).toBe('Enable debug logging.');
      expect(props.engine.description).toBe('The underlying playback engine instance.');
    });

    it('marks readonly properties correctly', () => {
      const props = findElement('ComplexVideo')!.reference.hostProperties;
      // engine: getter only → readonly
      expect(props.engine.readonly).toBe(true);
      // src: getter + setter → not readonly
      expect(props.src.readonly).toBe(false);
      expect(props.debug.readonly).toBe(false);
    });

    it('extracts property types', () => {
      const props = findElement('ComplexVideo')!.reference.hostProperties;
      expect(props.src.type).toBe('string');
      expect(props.debug.type).toBe('boolean');
      expect(props.config.type).toContain('Record');
    });

    it('deduplicates host props from nativeAttributes', () => {
      const ref = findElement('ComplexVideo')!.reference;
      // src and preload are in both the host AND native attributes.
      // They should appear in hostProperties...
      expect(ref.hostProperties.src).toBeDefined();
      expect(ref.hostProperties.preload).toBeDefined();
      // ...and be omitted from nativeAttributes
      expect(ref.nativeAttributes).not.toContain('src');
      expect(ref.nativeAttributes).not.toContain('preload');
      // Other native attrs remain
      expect(ref.nativeAttributes).toContain('autoplay');
      expect(ref.nativeAttributes).toContain('controls');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // EXTENDING MEDIA ELEMENT: ExtendingVideo
  // ─────────────────────────────────────────────────────────────────
  //
  // A media element whose host extends another host (mirrors
  // MuxVideoMedia extending HlsMedia). The builder must walk the
  // extends chain to include inherited properties. Child properties
  // override parent definitions.

  describe('ExtendingVideo (host inheritance)', () => {
    it('extracts the tag name', () => {
      const ref = findElement('ExtendingVideo')!.reference;
      expect(ref.tagName).toBe('extending-video');
    });

    it('includes own properties from ExtendingHost', () => {
      const props = findElement('ExtendingVideo')!.reference.hostProperties;
      expect(props.playbackId).toMatchObject({
        type: 'string',
        readonly: false,
        description: 'The playback ID for the video.',
      });
      expect(props.customDomain).toMatchObject({
        type: 'string',
        readonly: false,
        description: 'Custom domain for asset delivery.',
      });
    });

    it('includes inherited properties from ComplexHost', () => {
      const props = findElement('ExtendingVideo')!.reference.hostProperties;
      // These are inherited from ComplexHost
      expect(props.src).toBeDefined();
      expect(props.type).toBeDefined();
      expect(props.preferPlayback).toBeDefined();
      expect(props.config).toBeDefined();
      expect(props.preload).toBeDefined();
      expect(props.engine).toBeDefined();
    });

    it('child overrides replace parent definitions', () => {
      const props = findElement('ExtendingVideo')!.reference.hostProperties;
      // ExtendingHost overrides debug with different JSDoc
      expect(props.debug.description).toBe('Overrides parent debug — adds network logging.');
    });

    it('inherited readonly flags are preserved', () => {
      const props = findElement('ExtendingVideo')!.reference.hostProperties;
      // engine is readonly in ComplexHost and not overridden
      expect(props.engine.readonly).toBe(true);
    });
  });
});
