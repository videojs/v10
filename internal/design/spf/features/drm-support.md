---
status: draft
date: 2026-05-20
definition: coarse
---

# DRM support

Play protected content through EME while keeping key-system policy and license transport configurable by the adapter.

## Proposed direction

- Probe key-system and robustness compatibility before protected-track selection.
- Keep media-key attachment, session lifecycle, and license exchange separate.
- Expose application hooks for credentials, headers, certificates, and errors.
- Clean up sessions and pending requests on source replacement.

## Before implementation

Choose the first supported key systems and manifest signaling. Specify persistent-session policy, renewal, output restrictions, and error contracts. Test source replacement and clear/encrypted transitions.

## Related

[Capability probing](./capability-probing.md) and [source replacement](./source-replacement.md).
