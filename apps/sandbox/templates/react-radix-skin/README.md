# React + Radix skin (spike)

Same shape as `react-base-ui-skin`: one page, two approaches, feature parity with the default video skin, and the shared
toolbar (Approach, Media, Source, Captions) from `@app/shared/react/library-skin-harness`.

- **render** — Video.js components own behaviour, state, and accessibility; Radix primitives go in through `render`.
- **hooks** — Radix primitives (`radix-ui` umbrella: Slider, DropdownMenu, Tooltip, Popover, Toggle, AlertDialog) own
  rendering and interaction; Video.js supplies state, actions, and availability.

## What Radix added to the picture

1. **Radix has no Button primitive.** Plain buttons render into a shadcn-style button built on Radix `Slot`. That
   works because the button forwards `ref` and spreads unknown props, which is all `render` needs.
2. **Function-form `render` is the bridge to controlled library state.** `render={(props, state) => <Toggle.Root
   {...props} pressed={state.muted} />}` lets Radix `Toggle` show `aria-pressed`/`data-state` from Video.js state while
   Video.js keeps the click handling, `aria-label`, and `data-*`. Mute, captions, PiP, and fullscreen use it.
3. **`asChild` collisions on `data-state`.** In the hooks approach `Popover.Anchor asChild` wrapping `Toggle.Root`
   overwrites the toggle's `data-state="on|off"` with the popover's `data-state="closed|open"`. Video.js's `data-*`
   names never collide with Radix's.
4. **Radix DropdownMenu opens on `pointerdown`**, not `click`; programmatic `.click()` does nothing.
5. **Radix Popover has no hover-open.** The volume popover is controlled from pointer enter/leave on a wrapper so the
   trigger click stays the mute toggle.
6. **Radix Slider takes `number[]`** and puts `role="slider"` on the thumb `span`; keyboard `PageUp` fires
   `onValueCommit`, which maps cleanly to `time.seek()`.
7. **Portals** again need `container={useContainer()}` for tooltips, menus, popovers, and the alert dialog.

Everything in the Base UI README about Video.js-side friction and the parity table applies unchanged.
