---
status: implemented
date: 2026-02-26
---

# Source URL auto-detection for the installation page

The installation wizard accepts a media URL, suggests a compatible renderer, and uses that URL in generated code.

## Decisions

- Domain matching takes precedence over file-extension matching.
- Detection is filtered by the selected use case.
- A valid detection updates the renderer, while the UI uses hedged language and permits manual override.
- Mux stream URLs yield a playback ID for Mux-specific code generation.
- Unknown or empty URLs preserve manual selection and safe placeholder output.
- Renderer articles are an exhaustive typed map so new renderer labels require an explicit determiner.

## Current sources

- site/src/utils/installation/detect-renderer.ts
- site/src/utils/installation/codegen.ts
- site/src/components/installation/RendererSelect.tsx
- site/src/components/installation/MuxUploaderPanel.tsx
- site/src/stores/installation.ts
- colocated tests

Implementation and tests own the supported domain and extension lists.
