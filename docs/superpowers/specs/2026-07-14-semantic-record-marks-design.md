# Semantic Record Marks Design

## Problem

The first icon laboratory made motion and stylistic consistency the primary constraints. Its marks were variations of rails, bars, and cells, so their differences were formal rather than meaningful. A customer could not explain what most symbols represented without reading the label.

## Direction

Keep Record's implemented graphite, cool-line, Sora, mono-label, and violet-active-state system. Replace anonymous CSS primitives with inline SVG marks built around recognizable subjects and actions.

The catalogue uses five semantic families:

1. **Archive objects:** ledger, card catalogue, stamp, binder, drawer, index wheel, folio, sleeve, margin note, and atlas.
2. **Capture actions:** contactless payment, receipt filing, notification matching, merchant identification, amount capture, wallet assignment, source tracing, review, categorization, and confirmation.
3. **Continuity structures:** seasons, episodes, anime lineages, chapters, folded timelines, release trees, paused stories, next episodes, parallel seasons, and completed arcs.
4. **Life records:** the five product domains, daily stacks, habits, training, cash, listening, watching, one day, an almanac, and a life cabinet.
5. **Record signatures:** ten monograms that fuse `R` with a specific archive or register mechanism.

## Card Contract

Every one of the 50 cards contains:

- one unique inline SVG with a stable, recognizable silhouette;
- a visible `Means` statement explaining the metaphor;
- a visible `Moves` statement naming the loading action;
- three keyframes derived from the same SVG subject;
- a motion loop that performs a relevant action such as file, stamp, bind, scan, route, continue, assemble, or seal.

## Rejection Rules

Reject a concept when its rationale could apply equally to an unrelated SaaS product, when it differs only through arbitrary line placement, when the loader is a generic spinner, or when the static mark requires motion to become legible.

## Technical Form

The lab stays isolated at `frontend/public/icon-lab/index.html`. `lab.js` holds the semantic catalogue and inline SVG templates. `styles.css` supplies the Record visual system and action-specific SVG animation. Existing filtering, pause/replay, density, responsive, and reduced-motion behavior remains.
