# Record brand guidelines

Status: product direction. The customer name, mark, domains, and store listing still require clearance before public launch.

- Customer product: **Record**
- Repository and self-host distribution: **Personal Server**
- Promise: **Keep the life you live useful.**
- Category: a private personal record system

## Identity

The primary mark is **Bookplate R**: a book spine, index tabs, and an `R` formed from one continuous archive gesture. It represents ownership, continuity, and a personal collection of dependable records.

Bookplate R is the only customer-facing app identity. Do not use the retired turquoise hexagon, bar-chart/pulse mark, constellation, or generic dashboard symbols.

### Asset map

| Surface | Source |
|---|---|
| Product navigation and README | `frontend/public/logo-dark.svg` |
| Browser tab | `frontend/public/record-bookplate-r.svg` |
| PWA and install prompts | `frontend/public/pwa-192.png`, `pwa-512.png`, and `pwa-maskable-512.png` |
| Apple touch icon | `frontend/public/apple-touch-icon.png` |
| Android adaptive foreground | `frontend/android/app/src/main/res/drawable/ps_launcher_foreground.xml` |
| Android launcher manifest identity | `@mipmap/record_bookplate_r` and `@mipmap/record_bookplate_r_round` |

Keep the mark upright, preserve its graphite field and violet strokes, and do not add gradients, shadows, outlines, domain colors, or decorative animation. At small sizes, preserve the spine and `R` before secondary index details.

## Color

| Role | Value | Use |
|---|---|---|
| Canvas | `#090e14` | Application background |
| Surface | `#0e151e` | Registers and work areas |
| Raised | `#131c27` | Menus, sheets, and focused layers |
| Line | `#233041` | Structure and dividers |
| Primary text | `#f2f5f8` | Main content |
| Secondary text | `#96a3b4` | Supporting information |
| Record violet | `#7c5cff` | Identity, primary action, selection |
| Bookplate highlight | `#a999ff` | Mark detail and restrained emphasis |

Green, amber, and red are semantic success, review, and danger colors. Cyan is reserved for data comparison. Cash, Gym, Habits, Music, Series, and Assistant do not receive separate page themes.

## Typography

- **Sora Variable** for interface text, headings, controls, and body copy.
- **JetBrains Mono Variable** for dates, money, measurements, ranks, episode and set numbers, and source state.

Use compact, explicit hierarchy. Avoid oversized marketing headings inside the authenticated product and avoid decorative monospace body copy.

## Composition

The core product primitive is the **register**: a titled, divided group of inspectable rows. Prefer registers, ledgers, timelines, tables, and focused workbenches over floating card walls.

Normal hierarchy comes from spacing, planes, and rules. Shadows belong to overlays. Artwork and charts appear only when they carry information.

Do not reintroduce glassmorphism, neon glows, domain color washes, rainbow dashboards, abstract AI imagery, fake life scores, or decorative orbital graphics.

## Voice

Use short, factual language that names the record, source, time, state, and next action.

- “Detected from a Revolut notification.”
- “Set 2 matches last week.”
- “Episode 4 of 12.”
- “Last checked 4 minutes ago.”

Avoid motivational guilt, unsupported certainty, praise filler, faux intimacy, and “AI-powered” as a substitute for explaining behavior.

## Motion

Motion lasts roughly 120–220 ms and explains state, continuity, or confirmation. Loading uses Bookplate R as the recognizable product signature. Respect `prefers-reduced-motion`; never turn the mark into a generic spinner.

## Product portfolio

- **Record**: managed customer web and Android application.
- **Personal Server**: source repository and self-host distribution.
- Cash, Gym, Habits, Music, Series, and Assistant: record types inside one product, never separate brands.

See [the complete brand profile](product/BRAND_PROFILE.md) and the root [design system](../DESIGN.md) for interaction and route-level rules.
