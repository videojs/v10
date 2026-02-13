# Writing Style

Full writing style guidelines for Video.js documentation.

## Voice

Direct. Confident. Friendly but not chatty. Write like you are talking to a peer — helpful, not formal or distant.

```markdown
// ❌ Wordy
In order to create a new player instance, you'll need to call the
createPlayer function and pass in a configuration object.

// ✅ Direct
Create a player:

const player = createPlayer({ src: 'video.mp4' });
```

## Quick Rules

- **Sentence case for headings** — capitalize only the first word and proper nouns (e.g., "Choose your JS framework", not "Choose Your JS Framework")
- Active voice, second person ("you")
- Short sentences
- No filler ("In order to", "basically", "simply")
- No hedging ("might", "could", "perhaps")
- Code does the heavy lifting

## Guidelines

### Be human

Write like you are talking to a peer. Friendly and helpful, not formal or distant. Read your writing out loud — if it sounds awkward, rewrite it.

### Use simple words

> "Don't use a five-dollar word when a fifty-cent word will do." — Mark Twain

Simplify hard concepts into something easy to understand. If a piece of jargon is unavoidable, define it on first use.

### Cut to the point

Do not lean on flowery language. Simple and to the point is almost always an improvement. Every sentence should earn its place — delete ruthlessly.

### Speak directly to the reader

Use second person ("you") for the reader and first person plural ("we") for the project team. Do not talk about the reader in the third person.

> **We** build the player so **you** don't have to.

### Tell a story

Do not just check boxes. Tell the reader a coherent story — they should be able to imagine themselves solving whatever problem you are describing.

### Bias for words over symbols

Spell out words rather than use symbols. Use "and" rather than "&". Exceptions: space-constrained contexts or deliberate stylistic choices.

### Gender-neutral language

Speak directly to the reader with "you." If a pronoun is needed, use "they" or "their" instead of "his" or "her." Avoid gendered group terms.

### Headings: avoid gerunds

Prefer "Write good headings" over "Writing good headings." Gerunds create ambiguity — "Meeting requirements" could mean "how to meet requirements" or "the requirements for this meeting."

### Oxford comma

Always use the serial comma when writing a list of three or more things.

### Collaborative pronouns

Use "we," "us," and "our" when talking about the project, team, or things we are working on.

### Be precise, not vague

Make claims as strong as possible without becoming false. Vague qualifications ("somewhat," "fairly") weaken writing. If a statement is true, say it directly.

### Simplicity reveals mistakes

Simple writing exposes unclear thinking. If you cannot explain something simply, you may not understand it well enough yet. Complexity should come from the ideas, not the language.

## Words to avoid

| Avoid | Use instead |
|-------|-------------|
| "In order to" | "To" |
| "Basically" | (delete) |
| "Simply" | (delete) |
| "Just" | (delete) |
| "Very" | (delete) |
| "Actually" | (delete) |
| "You might want to" | "Use" |
| "It should be noted that" | (delete, say it directly) |
| "Please note that" | (delete, say it directly) |
| "As you can see" | (delete) |
| "Obviously" / "Clearly" | (delete) |

## Sentence patterns

### Task-oriented (preferred)

```markdown
Create a player with autoplay enabled.
Subscribe to state changes.
Handle errors using the error event.
```

### Avoid passive or wordy

```markdown
// ❌ Passive
A player can be created with autoplay enabled.

// ❌ Wordy
You can subscribe to state changes if you want.

// ❌ Over-explaining
The subscribe function returns an unsubscribe function
that you should call when you want to stop receiving
updates. This is important for preventing memory leaks
in your application.

// ✅ Code speaks
const unsubscribe = store.subscribe(callback);

// Later, cleanup:
unsubscribe();
```

### Linking concepts

```markdown
// ✅ Natural
See [Events](/concepts/events) for the full list.

// ❌ Awkward
For more information about events, please refer to the Events page.
```

## Length guidelines

| Content type | Target |
|---|---|
| Function description | 1 sentence |
| Concept intro | 1-2 sentences |
| Concept page | 300-500 words |
| How-to step section | 100-200 words |
| Code comments | < 10 words |
