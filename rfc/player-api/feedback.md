# Feedback

Collected feedback on the Player API design.

## On Adaptive Skins

**Feedback (@heff):**

There's obvious features to me like VR controls, clipping interfaces, viewer heatmaps, even ads, that I don't think we should bundle into a default theme, even with lazy loading. Pieces of back pressure I see are:

- Having to account for the UI of conflicting/competitive features, when they'd never be used together (maybe ad markers vs. clip markers as a rough example)
- Having to account for all features turned on at once when in reality that would never happen. For example 10+ buttons in the control bar.
- The file size of the no-bundler, cdn-hosted `<video-skin>`
- People actually being able to work with the default skin after ejecting it, not being overwhelmed by a ton of features they didn't realize it supported.

I would think we still aim for "website" use case in drawing the line for the default skin features. But interested to hear what features people would want added to that. e.g. Endscreen — included or not?
## On Feature Bundles

**Feedback (@luwes):**

What is the main reason for wanting to add these presets or feature bundles immediately in alpha / beta versus having these presets documented, copy/paste and maybe CLI generated? It just seems a lot less risky to add this later, maybe with community engagement than confusing users right away with various embed methods. Feeling @Darius Cepulis worries as well... Also increasing API surface, more to learn etc.

**Response:**

Raising a really good point! I'm very much in the middle-ish and I can make arguments either way. What's tilting me towards keeping:

1. We're not shipping all of these out of the gate. Just `video`, `audio` – `streaming` little further in beta. We can adjust based on feedback.
2. In the same way `video-skin` abstracts away individual UI components, `features.video` abstracts away individual capabilities. Both are sensible defaults for the 80%. Both should be "ejectable".
3. Upgrade path: add a new capability to `streaming`, users get it automatically.
4. Bundles actually reduce API surface from the user's perspective. Fewer imports to remember, fewer things to get wrong.
5. Testing internally will be easier to validate bundles as units than every possible combination.
6. Bundles teach users which features belong together. Most people just want streaming to work – they don't need to know about individual features.
7. I had concerns about CDN users juggling 10+ script tags, but HTTP/2 mostly invalidates the perf issue (I think?). It'd still be stressful having a code snippet with a whole bunch of script tags. It's a lot more elegant in a few lines.

My gut says let's ship a conservative set early on (audio/video) and reassess based on feedback (internal/external).
## On features.streaming

**Feedback (@decepulis):**

Consider the burden of education here. With presets, a dev didn't have to know what "adaptive streaming" is. Now they do. How do you think about this potential friction?

**Response:**

I think you're pointing at the fact that devs need to understand what "adaptive" means just to pull in the right import. I'm leaning towards "streaming" because it's intent-based, but really the goal is using terms that they're already feel familiar. It might be nice to alias `hls`/`dash` to `streaming` too – more likely someone knows that they have a HLS manifest but never heard of "adaptive streaming." We can play with this to find the right balance. Appreciate this one!
## Open Questions

### Default Skin Feature Set

Where do we draw the line for features included in the default `<video-skin>`?

Candidates:
- Endscreen — included or not?
- Chapters — included or not?
- Quality menu — included (with streaming feature)?

### CDN Bundle Strategy

For no-bundler CDN usage:
- Single mega-bundle with everything?
- Separate bundles per feature?
- Core + addons pattern?

### Skin Ejection Experience

How do we make ejected skins manageable?
- Clear separation of feature-specific UI
- Documentation of what each part does
- Generator/CLI tooling?
