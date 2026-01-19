# Issue Format

Standard format for all documentation review issues.

## Template

```markdown
### [SEVERITY] Issue title

**What:** Brief description of the problem
**Where:** `path/to/file.md` line 42
**Why:** Impact on readers/developers/agents
**Fix:** Concrete suggestion

<!-- Before -->
Original problematic content

<!-- After -->
Fixed content
```

## Severity Levels

| Level | Meaning | Examples |
|-------|---------|----------|
| `CRITICAL` | Blocks understanding, incorrect info | Wrong API, broken example, missing imports |
| `MAJOR` | Significantly hurts quality | Wall of text, missing See Also, wrong doc type structure |
| `MINOR` | Polish issues | Filler words, passive voice, inconsistent formatting |
| `NIT` | Suggestions, not problems | Could be shorter, alternative phrasing |

## Examples

### Critical

```markdown
### [CRITICAL] Example missing imports

**What:** Code example can't be copy-pasted
**Where:** `guides/getting-started.md` line 45
**Why:** Developers get errors, agents can't use the code
**Fix:** Add import statement

<!-- Before -->
const player = createPlayer({ src: 'video.mp4' });

<!-- After -->
import { createPlayer } from '@videojs/core';

const player = createPlayer({ src: 'video.mp4' });
```

### Major

```markdown
### [MAJOR] No See Also section

**What:** Page ends without linking related content
**Where:** `handbook/events.md` (end of file)
**Why:** Dead end — readers don't know where to go next
**Fix:** Add See Also with 2-4 relevant links

<!-- After -->
## See Also

- [State Management](/handbook/state)
- [Player API](/api/player)
- [Custom Events Guide](/guides/custom-events)
```

### Minor

```markdown
### [MINOR] Filler words

**What:** Unnecessary words dilute the message
**Where:** `api/player.md` line 12
**Why:** Wastes reader attention, unprofessional tone
**Fix:** Delete filler

<!-- Before -->
In order to basically create a player, you simply need to...

<!-- After -->
Create a player:
```

### Nit

```markdown
### [NIT] Could use tabs for frameworks

**What:** Shows only React example
**Where:** `guides/installation.md` line 30
**Why:** Vue/Svelte/Solid users need to translate mentally
**Fix:** Add framework tabs (optional improvement)
```
