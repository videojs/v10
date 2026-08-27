# Diátaxis boundaries and language

Distilled from [Diátaxis](https://diataxis.fr/). The document-type map and the compass for picking a mode live in `site/src/content/docs/how-to/write-guides.mdx`. Read this file when content drifts between modes or a passage's tone feels wrong for its page type.

## Apply the compass to passages, not only pages

The compass (action vs. cognition, study vs. work) also works at the sentence and paragraph level. When a passage feels off, ask which quadrant it serves and move it to the page type that owns that quadrant, leaving a link behind when readers need the trail.

## What does not belong in each type

- How-to guide: no teaching and no digression. Background beyond what the reader needs to adapt the code links to a concept page. Exhaustive options, defaults, and surfaces link to reference.
- Concept page: no step-by-step instruction and no close-up API detail. Steps that creep in belong in a how-to; exact surfaces belong in reference.
- Reference page: no instruction, persuasion, or opinion. Describe the machinery; do not walk the reader through tasks or argue for approaches. Link how-to guides for tasks and concept pages for rationale.
- Tutorial: we deliberately publish none yet. The Getting started sidebar category is not one — it mixes essential concept and how-to pages, each following its own type's rules above. If we add true tutorials later: no alternatives and minimal explanation, and the writer carries the lesson — every step must work, produce a visible result quickly, and lead to the next.

## The language of each type

Each mode has characteristic sentence forms. When your sentences read like a different mode, the content is probably in the wrong place.

- How-to guide: imperatives and conditional imperatives aimed at the reader's goal. "To loop playback, set…" "If you self-host, configure…"
- Concept page: discussion of why and how things relate. "Features are split this way because…" "Compared with the native element…" Alternatives, trade-offs, and opinions are welcome here, and only here.
- Reference page: neutral statements of fact in one consistent shape per kind of entry. "`preload` accepts…" "Defaults to…" Examples illustrate usage without teaching or advocating.
- Tutorial (if we add them): guided steps with confirmations. "First, create…" "You should see…"

## Reference tone

Reference is austere by design: neutral, consistent, and example-rich. Its value is accuracy, completeness, and predictable structure. The api-docs-builder provides the structure; hold hand-written prose on reference pages to the same standard, and spend warmth and persuasion in how-tos and concepts instead.
