# Personal Server — Brand Guidelines

> A personal data dashboard that integrates fitness, finances, habits, and music into one unified view.

---

## Logo

### Concept

The logo represents **integrated personal data** through three key elements:

1. **Hexagon Frame** — Modularity and connection (6 vertices = interconnected data sources)
2. **Bar Chart** — Quantified self, metrics, progress tracking
3. **Pulse Line** — Life, activity, health, real-time data
4. **Center Node + Lines** — You at the center, everything connected

### Variants

| File | Use Case |
|------|----------|
| `logo.svg` | Default, works on both themes |
| `logo-dark.svg` | Optimized for dark backgrounds |
| `logo-light.svg` | Optimized for light backgrounds |
| `favicon.svg` | Simplified version for browser tabs |

### Logo Usage

- **Minimum size**: 24px (favicon), 32px (UI), 48px (marketing)
- **Clear space**: Maintain padding equal to the logo height ÷ 4
- **Don't**: Stretch, rotate, add effects, or change colors outside the palette

---

## Color Palette

### Dark Theme (Default)

```css
/* Surfaces */
--color-bg-base: #0a0f1a;      /* Deep navy background */
--color-bg-surface: #0f1724;   /* Card/panel background */
--color-bg-elevated: #151d2e;  /* Modal/elevated surfaces */

/* Text */
--color-text-primary: #e6eef6;              /* Main text */
--color-text-secondary: rgba(230,238,246,0.70);  /* Secondary text */
--color-text-muted: rgba(230,238,246,0.45);      /* Muted/placeholder */

/* Accent — Sky Blue */
--color-accent: #7dd3fc;       /* Primary accent */
--color-accent-hover: #93dcfd; /* Hover state */
--color-accent-muted: rgba(125,211,252,0.15); /* Backgrounds */
--color-accent-text: #041024;  /* Text on accent */

/* Semantic Colors */
--color-success: #4ade80;      /* Green — positive, complete */
--color-warning: #fbbf24;      /* Amber — caution */
--color-error: #f87171;        /* Red — error, danger */
--color-info: #60a5fa;         /* Blue — informational */
```

### Light Theme

```css
/* Surfaces */
--color-bg-base: #f0f4f8;
--color-bg-surface: #ffffff;
--color-bg-elevated: #ffffff;

/* Text */
--color-text-primary: #0f172a;
--color-text-secondary: rgba(15,23,42,0.65);
--color-text-muted: rgba(15,23,42,0.40);

/* Accent — Sky Blue (darker for contrast) */
--color-accent: #0284c7;
--color-accent-hover: #0369a1;
--color-accent-muted: rgba(2,132,199,0.12);
--color-accent-text: #ffffff;
```

### Color Semantics

| Color | Hex (Dark) | Usage |
|-------|------------|-------|
| Sky Blue | `#7dd3fc` | Primary action, links, active states |
| Green | `#4ade80` | Success, positive trends, complete |
| Amber | `#fbbf24` | Warnings, attention needed |
| Red | `#f87171` | Errors, destructive actions, negative |
| Blue | `#60a5fa` | Informational, neutral highlights |

### Category Colors (Data Visualization)

For charts and data categories, use these consistent mappings:

| Category | Dark Mode | Light Mode | Notes |
|----------|-----------|------------|-------|
| Fitness/Gym | `#4ade80` | `#16a34a` | Green = health, growth |
| Finances | `#fbbf24` | `#d97706` | Amber = gold, money |
| Habits | `#a78bfa` | `#7c3aed` | Purple = mindfulness |
| Music | `#f472b6` | `#db2777` | Pink = creative, fun |
| General | `#7dd3fc` | `#0284c7` | Default accent |

---

## Typography

### Font Family

**Inter** — Clean, modern, excellent readability at all sizes.

```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 1.75rem (28px) | 800 | 1.2 |
| H2 | 1.4rem (22px) | 700 | 1.3 |
| H3 | 1.15rem (18px) | 700 | 1.4 |
| Body | 1rem (16px) | 400 | 1.6 |
| Small | 0.875rem (14px) | 400 | 1.5 |
| Caption | 0.75rem (12px) | 500 | 1.4 |

### Font Weights

- **400**: Body text, descriptions
- **500**: Labels, secondary headers
- **600**: Emphasized text, active states
- **700**: Headers (H2, H3)
- **800**: Main titles (H1), brand text

---

## Spacing System

Based on 4px increments (0.25rem):

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px (0.25rem) | Tight gaps, icon padding |
| `sm` | 8px (0.5rem) | Small gaps, compact lists |
| `md` | 16px (1rem) | Default spacing |
| `lg` | 24px (1.5rem) | Section gaps |
| `xl` | 32px (2rem) | Page padding, large gaps |
| `2xl` | 48px (3rem) | Hero spacing |

---

## Border Radius

```css
--radius-sm: 6px;   /* Badges, small buttons */
--radius-md: 10px;  /* Inputs, standard buttons */
--radius-lg: 14px;  /* Cards */
--radius-xl: 20px;  /* Modals, large cards */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Effects

### Glassmorphism

The primary surface style uses frosted glass:

```css
background: rgba(15, 23, 42, 0.60);       /* Semi-transparent */
backdrop-filter: blur(16px);              /* Blur effect */
border: 1px solid rgba(255,255,255,0.08); /* Subtle border */
box-shadow: 0 8px 32px rgba(0,0,0,0.35);  /* Soft shadow */
```

### Transitions

```css
--transition-fast: 150ms ease;   /* Hover states, micro-interactions */
--transition-normal: 250ms ease; /* UI changes, modals */
--transition-slow: 400ms ease;   /* Large layout shifts */
```

---

## Grid & Layout

### Sidebar

- **Expanded**: 260px
- **Collapsed**: 72px
- **Mobile**: Full width, bottom navigation

### Content Area

- **Padding**: 2rem (32px) desktop, 1.25rem mobile
- **Max width**: 1400px for optimal readability

### Card Grid

```css
grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
gap: 0.75rem;
```

---

## Component Guidelines

### Buttons

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | `accent` | `accent-text` | none |
| Ghost | transparent | `text-primary` | `glass-border` |
| Danger | `error-muted` | `error` | none |
| Success | `success-muted` | `success` | none |

### Cards

- Use glassmorphism style
- Interactive cards get `translateY(-2px)` on hover
- Maintain consistent padding (1.25rem)

### Inputs

- Background: `rgba(0,0,0,0.15)`
- Focus: accent border + glow
- Keep placeholder text muted

---

## Accessibility

- Maintain 4.5:1 contrast ratio for text
- Use semantic colors consistently
- Support both light and dark themes
- Icons paired with text for clarity
- Focus states visible and clear

---

## File Structure

```
public/
├── logo.svg          # Main logo (adaptive)
├── logo-dark.svg     # Dark theme optimized
├── logo-light.svg    # Light theme optimized
└── favicon.svg       # Browser favicon

src/
└── styles.css        # All CSS variables defined here
```

---

## Quick Reference

```
Primary:     #7dd3fc (dark) / #0284c7 (light)
Success:     #4ade80 / #16a34a
Warning:     #fbbf24 / #d97706  
Error:       #f87171 / #dc2626
Info:        #60a5fa / #2563eb

Background:  #0a0f1a (dark) / #f0f4f8 (light)
Surface:     #0f1724 (dark) / #ffffff (light)
Text:        #e6eef6 (dark) / #0f172a (light)

Font:        Inter (400, 500, 600, 700, 800)
Radius:      6/10/14/20px
Spacing:     4px base unit
```
