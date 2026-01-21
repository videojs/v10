# RFC Anti-Patterns

Common mistakes that make RFCs harder to read and review.

## 1. Solution Before Problem

**Mistake:** Jumping straight into API design without establishing context.

```markdown
// Bad — reader has no idea why
## API

createPlayer(presets.website) returns Provider, usePlayer, etc.
```

```markdown
// Good — establishes need first
## Problem

Two concerns, one player: Media (play, pause) and Container (fullscreen, keyboard).
Different targets, different lifecycles. But users want one API.

## Solution

Unified proxy that merges both stores...
```

**Fix:** Always start with the pain. A first-time reader needs to understand "why does this matter?" before "how does it work?"

## 2. Assumed Context

**Mistake:** Referencing concepts before explaining them.

```markdown
// Bad — what's PlayerTarget? what's a proxy?
PlayerTarget includes a reference to the media proxy.
Feature authors use hasFeature() to narrow types.
```

```markdown
// Good — explain concepts in order
Media features observe `<video>`. Player features need access to media state.

PlayerTarget includes a media proxy — a lightweight wrapper that provides
the same flat API (state + requests) that components use.

To check if a feature is available, use `hasFeature()`:
```

**Fix:** Introduce concepts in the order a reader needs them. If you reference X, X must be explained already.

## 3. Implementation Over Design

**Mistake:** Including implementation details that don't help understanding.

```markdown
// Bad — too much detail
function usePlayer() {
  const store = useContext(PlayerContext);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const proxyRef = useRef<PlayerProxy>();

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      if (proxyRef.current?.hasChanges()) {
        forceUpdate();
      }
    });
    return unsubscribe;
  }, [store]);
  // ... 30 more lines
}
```

```markdown
// Good — illustrates the concept
const player = usePlayer();
player.paused;  // state access subscribes automatically
player.play();  // requests are methods
```

**Fix:** Code in RFCs illustrates ideas. Save implementation for PRs.

## 4. Wall of Text

**Mistake:** Dense paragraphs that bury key points.

```markdown
// Bad
The player API provides a unified interface for accessing both media and container
state through a single object. This is achieved by creating two internal stores,
one for media features and one for player features, which are then merged together
using a proxy-based approach that tracks property access and automatically
subscribes to changes. This means that when you access player.paused in a render
function, the component will automatically re-render when paused changes.
```

```markdown
// Good
Two stores internally, one API externally.

- **Media store** — playback, volume, time
- **Player store** — fullscreen, keyboard, idle

Access via proxy:

player.paused;  // reads media state
player.isFullscreen;  // reads player state

Proxy tracks access, subscribes automatically.
```

**Fix:** Use lists, code blocks, and white space. One idea per paragraph.

## 5. Duplicated Content

**Mistake:** Same information in multiple places that drifts over time.

```markdown
// In index.md
hasFeature() narrows the type so you can access feature-specific state.

// In primitives.md
hasFeature() is a type guard that narrows the proxy type.

// In decisions.md
hasFeature() provides type narrowing for feature detection.
```

**Fix:** Explain once, link everywhere else. Pick the most appropriate location for the canonical explanation.

## 6. Missing "Why"

**Mistake:** Documenting what without explaining why.

```markdown
// Bad — no rationale
### Flat API Shape

State and requests are on the same object.

player.paused;
player.play();
```

```markdown
// Good — explains the choice
### Flat API Shape

**Decision:** State and requests on same object, no `.state`/`.request` namespaces.

**Why:**
- Less nesting = less typing
- Naming convention prevents collisions (state = nouns, requests = verbs)
- Proxy tracking works at property level

**Trade-off:** Requires runtime duplicate detection.
```

**Fix:** Every design choice has a trade-off. Document what you gain and what you lose.

## 7. Outdated Examples

**Mistake:** Code examples that don't match the current proposal.

This happens when the RFC evolves but examples aren't updated.

**Fix:**

- Keep examples minimal so they're easy to update
- Use one canonical example and reference it
- Before finalizing, verify all examples work with the proposed API

## 8. Feature Creep

**Mistake:** RFC scope grows to include every possible extension.

```markdown
// Bad — scope creep
## Future Considerations

- DevTools integration
- Time-travel debugging
- Server-side rendering
- React Native support
- Plugin marketplace
- Analytics dashboard
```

**Fix:** RFCs propose one thing. Future work belongs in "Open Questions" or separate RFCs.

## 9. Passive Voice

**Mistake:** Vague language that obscures responsibility.

```markdown
// Bad
The state will be updated when changes are detected.
Errors should be handled appropriately.
```

```markdown
// Good
The proxy updates state when the store changes.
Throw StoreError for invalid feature access.
```

**Fix:** Be specific. Who does what?

## Checklist

Before submitting an RFC, check for:

- [ ] Problem statement before solution
- [ ] Concepts explained before referenced
- [ ] Code illustrates ideas (not implementation)
- [ ] Key points not buried in paragraphs
- [ ] No duplicated content across files
- [ ] Every decision has rationale
- [ ] Examples match current proposal
- [ ] Scope is focused
- [ ] Active voice, specific language
