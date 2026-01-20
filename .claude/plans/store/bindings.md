# Store React/DOM Bindings

**Status:** COMPLETED (Superseded by reactive.md)

## Summary

Implemented React and Lit bindings for `@videojs/store`: `createStore()` factory returning Provider + hooks/controllers.

## Key PRs

| Phase | PR                                                                                               | Description                                            |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 0     | [#283](https://github.com/videojs/v10/pull/283)                                                  | `uniqBy`, `composeCallbacks`, `extendConfig` utilities |
| 0.5   | [#287](https://github.com/videojs/v10/pull/287)                                                  | Queue task refactor                                    |
| 1     | [#288](https://github.com/videojs/v10/pull/288)                                                  | React bindings                                         |
| 2     | [#289](https://github.com/videojs/v10/pull/289)                                                  | Lit bindings                                           |
| 3     | [#292](https://github.com/videojs/v10/pull/292)                                                  | DOM media slices                                       |
| 4-5   | [#290](https://github.com/videojs/v10/pull/290), [#291](https://github.com/videojs/v10/pull/291) | Mutation/Optimistic hooks                              |
| 6     | [#298](https://github.com/videojs/v10/pull/298)                                                  | Frosted skin                                           |

## Key Decisions

- Package structure: `store/react` and `store/lit`
- Provider resolution: Isolated by default; `inherit` prop for parent context
- Lit mixins: `StoreMixin` (combined), `StoreProviderMixin`, `StoreAttachMixin`

## Notes

Selector-based APIs were later replaced by proxy-based reactivity. See `reactive.md`.
