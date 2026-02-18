# Quick Review Checklist

Single-agent checklist for fast documentation reviews without forking.

## Voice

See `references/writing-style.md` for full guidelines.

- [ ] No filler words (basically, simply, just, in order to, actually, really)?
- [ ] No hedging (might, could, perhaps, it seems)?
- [ ] Active voice throughout?
- [ ] Sentence case headings?
- [ ] No gerund headings ("Add a theme" not "Adding a theme")?
- [ ] Direct address ("you" not "the developer")?
- [ ] Concise — no unnecessary words?

## Structure

See SKILL.md for doc types and templates.

- [ ] Correct doc type (concept vs how-to)?
- [ ] Matches template structure?
- [ ] Code appears before explanation?
- [ ] Progressive — starts simple, adds complexity?
- [ ] Has "See also" section with related links?
- [ ] `<Aside>` used correctly (not `:::note`)?
- [ ] Correct callout types (note/tip/caution/danger)?
- [ ] No H1 — title from frontmatter only (site pages)?

## Code

See `patterns/code-examples.md` for conventions.

- [ ] All examples include imports?
- [ ] Examples are runnable (copy-paste ready)?
- [ ] Realistic values, not `foo`/`bar`?
- [ ] Output shown when result isn't obvious?
- [ ] All fenced code blocks have language tags?
- [ ] Self-contained — no hidden dependencies?

## Site Pages

- [ ] Added to sidebar in `docs.config.ts`?
- [ ] Renders for all framework combinations?
- [ ] `client:idle` on all Tab components (never `client:visible`)?
- [ ] MDX components used correctly (`<FrameworkCase>`, `<Demo>`, etc.)?

## READMEs

- [ ] Has npm badge and alpha warning?
- [ ] Install command present?
- [ ] Has working quick example with imports?
- [ ] Code examples are self-contained?
- [ ] Community section with Discord and Discussions links?
- [ ] License section?

## Related Skills

For component reference pages, use the `api-reference` skill review process instead.
