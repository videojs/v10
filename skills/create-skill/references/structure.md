# Repository skill structure

Checked-in skills are direct children of a flat, host-neutral catalog:

```text
skills/
└── <globally-unique-action-name>/
    ├── SKILL.md
    ├── references/  # optional, conditional detail
    ├── scripts/     # optional, deterministic automation
    └── assets/      # optional, output inputs
```

`pnpm link:aliases` exposes the whole catalog through generated `.agents/skills/`, `.claude/skills/`, and `.opencode/skills/` directory links. Do not create per-skill links or depend on recursive discovery inside a host's skills directory.

## Portable metadata

Use only `name` and `description`. The name must match the immediate parent directory, use verb-first lowercase kebab-case, and be globally unique. Put what the skill does and when it should trigger in the description; the body is unavailable during discovery.

## Resources

- Keep `SKILL.md` as the workflow and conditional resource index.
- Include one small input/output example that demonstrates success.
- Link references directly and state when to read each one.
- Keep references one level deep when practical.
- Use a script only for repeated deterministic work; test it directly.
- Keep templates only when exact structure matters and code is not a better generator.

Run `pnpm check:workspace` to validate naming, metadata, aliases, and context budgets.
