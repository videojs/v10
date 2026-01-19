# Store React/DOM Bindings

> **STATUS: COMPLETED** — Superseded by `proxies.md` for API changes.

## Summary

Implemented React and Lit bindings for `@videojs/store`:

- `createStore()` factory returning Provider + hooks/controllers
- Skins define store configs, export Provider + Skin + extendConfig
- Base hooks/controllers for testing and advanced use

## Completed Work

| Phase | PR                                              | Description                                                   |
| ----- | ----------------------------------------------- | ------------------------------------------------------------- |
| 0     | [#283](https://github.com/videojs/v10/pull/283) | `uniqBy`, `composeCallbacks`, `extendConfig` utilities        |
| 0.5   | [#287](https://github.com/videojs/v10/pull/287) | Queue task refactor (unified tasks map, status discriminator) |
| 1     | [#288](https://github.com/videojs/v10/pull/288) | React bindings (createStore, Provider, hooks)                 |
| 2     | [#289](https://github.com/videojs/v10/pull/289) | Lit bindings (controllers, mixins, context)                   |
| 3     | [#292](https://github.com/videojs/v10/pull/292) | DOM media slices (playback, time, buffer, volume, source)     |
| 4     | [#290](https://github.com/videojs/v10/pull/290) | Mutation hooks/controllers                                    |
| 5     | [#291](https://github.com/videojs/v10/pull/291) | Optimistic hooks/controllers                                  |
| 6     | [#298](https://github.com/videojs/v10/pull/298) | Frosted skin (React + HTML)                                   |

## Key Decisions

- Hook naming: `useStore`, `useSelector`, `useRequest`, `useTasks`, `useMutation`, `useOptimistic`
- Controller naming: `SelectorController`, `RequestController`, `TasksController`, etc.
- Mutation/Optimistic: Discriminated union types with `status` field
- Lit mixins: `StoreMixin` (combined), `StoreProviderMixin`, `StoreAttachMixin`
- Provider resolution: Isolated by default; `inherit` prop for parent context
- Package structure: `store/react` and `store/lit`

## Superseded By

The selector-based APIs (`useSelector`, `SelectorController`, `store.subscribe()`) are being
replaced by proxy-based reactivity. See **`proxies.md`** for the migration plan.
