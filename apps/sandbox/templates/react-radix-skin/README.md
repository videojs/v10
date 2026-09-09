# React + Radix skin (spike)

Same shape as `react-base-ui-skin`: one page, two approaches behind the **Approach** dropdown / `approach` URL param.

- **render** — Video.js components own behaviour, state, and accessibility; Radix primitives go in through `render`.
- **hooks** — Radix primitives (`radix-ui` umbrella: Slider, DropdownMenu, Tooltip, Popover, Toggle) own rendering and
  interaction; Video.js supplies state and actions.

## What Radix added to the picture

1. **Radix has no Button primitive.** Plain buttons render into a shadcn-style button built on Radix `Slot`. That
   works because the button forwards `ref` and spreads unknown props, which is all `render` needs.
2. **Function-form `render` is the bridge to controlled library state.** `render={(props, state) => <Toggle.Root
   {...props} pressed={state.muted} />}` lets Radix `Toggle` show `aria-pressed`/`data-state` from Video.js state
   while Video.js keeps the click handling, `aria-label`, and `data-*`. Verified: after a mute click the element carries
   `aria-pressed="true"`, `data-state="on"`, `data-muted`, `data-volume-level="off"` together.
3. **`asChild` collisions on `data-state`.** In the hooks approach `Popover.Anchor asChild` wrapping `Toggle.Root`
   overwrites the toggle's `data-state="on|off"` with the popover's `data-state="closed|open"`. Any Radix-on-Radix
   stack that styles by `data-state` has to pick one owner; Video.js's `data-*` names do not collide with Radix's.
4. **Radix DropdownMenu opens on `pointerdown`**, not `click`; programmatic `.click()` does nothing. Fine for users,
   worth knowing for tests.
5. **Radix Popover has no hover-open.** The volume popover is controlled from pointer enter/leave on a wrapper so the
   trigger click stays the mute toggle. Video.js's `VolumePopover` handles this itself.
6. **Radix Slider takes `number[]`** and puts `role="slider"` on the thumb `span`; keyboard `PageUp` steps 10× and
   fires `onValueCommit`, which maps cleanly to `time.seek()`.
7. **Portals** again need `container={useContainer()}` for tooltips, menus, and popovers to survive fullscreen.

Everything in the Base UI README about Video.js-side friction applies unchanged: sliders cannot be `render`ed into a
library slider, Video.js menus/popovers/tooltips are whole-compound swaps, tooltip labels flow by context push, and
`disabled` is a core prop.
