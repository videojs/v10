# Visual Evidence

Read this reference only when a pull request changes observable skin or site visual elements.

Include this section after Changes or its implementation details and before Testing:

```markdown
## Visual Evidence

[Link the live preview or provide proportional fallback evidence]
```

Prefer linking to the live sandbox preview when it clearly demonstrates the change and lets reviewers inspect the affected states. Include any route, viewport, theme, or interaction steps needed to reproduce it.

When no reliable preview is available—or the change is difficult to find or reproduce there—provide matched before/after screenshots. Clearly mark the changed areas and include only the interaction states relevant to the change.

Add a short video when motion, timing, responsive behavior, or a multi-step interaction is easier to understand in motion. A representative screenshot may also be included when a durable record would be useful, but a full screenshot set is unnecessary when the preview already covers the change.

Visual evidence helps reviewers verify the implementation. It does not, by itself, request a broader design review.
