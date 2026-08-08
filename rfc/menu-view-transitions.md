---
status: implemented
---

# Menu view transitions

## Problem

Nested settings menus need coordinated panel and size transitions, but the previous parent-owned navigation stack, `Menu.View`, viewport synchronizer, and setting-aware items made every Menu pay for nested navigation. The transition API should bind existing menu roots without becoming a router or generic transition engine.

## Decision

Base Menu owns one independent root: resolved open state, trigger, content, items, focus, positioning, ordinary selection, and the `data-submenu` styling contract when an adapter explicitly binds it as a child. It has no parent lookup, implicit nested navigation, navigation stack, command-target routing, player-setting behavior, or panel transitions. An unwrapped nested root remains an independent popup.

Interactions request open changes; adapters commit their resolved value through `syncOpen(open)`. Controlled requests do not become visible until the controlled value changes, and completion callbacks describe committed transitions.

Nested navigation and panel transitions share one optional boundary. This is intentional: the parent/child binding supplies both navigation semantics and the panels to animate. A smaller navigation-only entry can wait for a concrete consumer.

## Public API

React keeps one compound API on the existing root export:

```tsx
import { Menu } from '@videojs/react';

<Menu.Root>
  <Menu.Trigger>Settings</Menu.Trigger>
  <Menu.TransitionRoot render={<Menu.Content />} className="root-panel">
    <Menu.TransitionView render={<Menu.Root />}>
      <Menu.Trigger>Quality</Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Back</Menu.Item>
        {/* options */}
      </Menu.Content>
    </Menu.TransitionView>
  </Menu.TransitionRoot>
</Menu.Root>;
```

`TransitionRoot` and `TransitionView` are properties of the existing `Menu` namespace; there is no React transition subpath. Because the namespace is materialized as one object, consumers of `Menu` deliberately pay for its complete namespace and its net bundle impact must be measured after the replaced navigation machinery is removed.

HTML wraps the existing menu roots:

```html
<button commandfor="settings-menu">Settings</button>
<media-menu-transition-root>
  <media-menu id="settings-menu">
    <media-menu-item commandfor="quality-menu">Quality</media-menu-item>
    <media-menu-transition-view>
      <media-menu id="quality-menu">
        <media-menu-item>Back</media-menu-item>
        <!-- options -->
      </media-menu>
    </media-menu-transition-view>
  </media-menu>
</media-menu-transition-root>
```

`media-menu-transition-root` binds exactly one direct root `media-menu`; each view binds one child menu. Existing `commandfor` IDs identify child menus. The wrapper is not the popup or command target. Import `@videojs/html/ui/menu-transition` to register this behavior.

Both platforms generate the root panel internally. Consumers do not author a root-view element. An ordinary item is the back row because selecting it closes its current child menu; the old Back and View parts are removed.

## Data flow and behavior

```text
nested item event
  -> optional binding requests child open/close
  -> adapter resolves controlled or uncontrolled state
  -> child Menu commits open state
  -> coordinator publishes active panel, direction, and lifecycle state
  -> React or HTML renders presence, accessibility, and target size
  -> CSS owns motion and container presentation
```

The coordinator keeps outgoing and incoming lifecycle state until visual completion and cancels stale work during interruption. It does not set attributes, element properties, or CSS variables. React and HTML subscribe to that state, render the established contract, measure the active destination, and observe it with `ResizeObserver`. The most recently opened child wins if invalid controlled state leaves several children open; development builds warn rather than mutating controlled state.

Only the active panel is interactive and accessibility-visible. Inactive and exiting panels receive `inert` and `aria-hidden`; completed hidden panels also receive `hidden`. Forward navigation focuses the first child item. Back navigation restores focus to the bound trigger. ArrowRight, ArrowLeft, Escape, direction, and child exclusivity belong only to the optional binding.

Internal phases map onto established styling hooks:

| Phase | Contract |
| --- | --- |
| hidden | `data-view-state="inactive"`, `hidden`, no `data-open` |
| entering | active, `data-open`, `data-starting-style`, direction |
| active | active, `data-open`, direction |
| exiting | inactive, `data-open`, `data-ending-style`, direction |

Every panel has `data-menu-view`. The generated root also has `data-menu-root-view`. Child content receives `data-submenu` from the base `MenuDataAttrs` contract, not from transition state, so submenu presentation remains available independently of this integration. Direction remains `data-direction="forward|back"`. The old `data-menu-view-state` becomes `data-view-state`.

The outer `Menu.Content` is the stable viewport and the generated element is the moving root panel. They cannot be the same node: hiding or making the outer content inert would also hide or disable its active submenu descendants, and transforming it would transform both outgoing and incoming panels. React applies `TransitionRoot`'s `className` and `style` to the generated root panel. HTML exposes the equivalent `root-view-class` attribute for utility-class skins.

CSS retains all four Menu variables:

```text
--media-menu-width
--media-menu-height
--media-menu-available-width
--media-menu-available-height
```

Base positioning aliases Popover constraints into the available-size variables. The platform transition adapters publish measured destination width and height. Keeping the names in `MenuCSSVars` does not pull transition behavior into base Menu. CSS owns transforms, blur, opacity, duration, easing, and reduced-motion behavior.

## Package boundaries

- `@videojs/core/dom` exports the shared coordinator, following the existing core DOM utility convention.
- `@videojs/react` exposes transition parts on its existing `Menu` namespace. There is no separate React transition export.
- `@videojs/html/ui/menu-transition` registers transition wrappers and nested command routing.
- `@videojs/html/ui/menu-settings` registers optional setting value and availability behavior.
- Base React and HTML Menu modules contain no player-setting cores or selectors. React presets render values from their existing option hooks.

The optional core and HTML modules import base Menu primitives; base core and base HTML never import or dynamically select them. Module absence is the acceptance gate for those graphs. React intentionally has a different boundary: `Menu` is a complete ESM namespace, so its post-refactor byte and gzip totals are the acceptance signal rather than assumed per-property tree shaking.

Bundle measurements are recorded only after building the complete root `Menu` namespace. Core and HTML metafiles separately verify that their base entries exclude transition and setting modules.

## Implementation and verification

1. Make Menu requests distinct from committed open state and remove parent navigation, Back, View, and old viewport machinery.
2. Add the menu-specific coordinator with explicit root/view registration, reactive lifecycle state, interruption handling, and controlled-state diagnostics.
3. Add React and HTML bindings that render attributes, accessibility isolation, focus restoration, measurement, generated root panels, and separate registrations; migrate presets and examples.
4. Move HTML setting behavior behind its own registration entry and keep generic items neutral.
5. Migrate skins to existing transition attributes and retained CSS variables; update reference and design documentation.
6. Build bundle metafiles, measure the complete React `Menu` namespace, and assert base Core and HTML graphs exclude transition/navigation/settings modules while optional entries include only their intended graph.
7. Verify controlled state, preventDefault, keyboard/back behavior, focus, one accessible panel, outgoing presence, reconnect/shadow DOM, interruption, dynamic size, and multiple controlled children.

Implementation is complete when package tests and builds, type checking, workspace checks, consumer examples, and module-graph assertions pass. Byte and gzip sizes are secondary signals.

## Alternatives rejected

- Keeping the stack or splitting only animation leaves nested policy in every Menu.
- Adopting PR #1994 directly simplifies ownership but immediately hides outgoing content; its local child-state model is retained instead.
- An authored or inferred root view creates consumer markup or hidden structure requirements.
- New phase attributes or renamed target-size variables duplicate established contracts.
- A generic transition compound broadens public machinery before a second consumer exists.

## Non-goals

- Browser View Transitions API compatibility, snapshots, or shared-element morphing.
- A general router, history, transition graph, or JavaScript animation options.
- Automatic participation by unwrapped menus or arbitrary descendants.

## Related sources

- [Menu design](../internal/design/ui/menus.md)
- [Menu simplification exploration](https://github.com/videojs/v10/pull/1994)
- `packages/react/src/ui/menu/`
- `packages/html/src/ui/menu/`
- `packages/core/src/dom/ui/menu/`
