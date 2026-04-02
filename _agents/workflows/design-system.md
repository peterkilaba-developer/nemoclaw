---
description: NemoC LAW AI Design System — Lawyer-grade visual standards for all UI development
---

# NemoC LAW AI — Design System & Visual Standards

## Mandatory Initial Step
**BEFORE making ANY changes to the codebase, UI, or documentation, you MUST:**
1. **Analyze the Codebase**: Read the relevant files to understand existing patterns and architecture.
2. **Review the UI**: Inspect the current visual state in the browser to identify violations or required updates.
3. **Audit Documentation**: Read all internal instructions (e.g., `_agents/workflows/*.md`, `NemoClaw_AI_Deep_Dive.md`) and Knowledge Items to ensure alignment with current objectives.
4. **Confirm Context**: Verify that your understanding of the current state matches the user's latest requests.

---

## Audience
**Lawyers.** Conservative, authoritative professionals. They trust institutions, not flash.
Our UI must feel like a Bloomberg Terminal for law — not a SaaS startup landing page.

---

## Core Principles

1. **Subtlety over spectacle.** No flashy gradients, no glowing borders, no neon accents.
2. **Authority through restraint.** The less you decorate, the more premium it feels.
3. **Invisible containers.** Cards and sections are separated by *barely-there* contrast, NOT visible borders.
4. **Typography does the work.** Use font weight, size, and spacing to create hierarchy — not color.
5. **Green is earned.** Our primary green (`#76b900`) is used sparingly for: active states, CTAs, and key data points. Never for decoration.

---

## Color Palette — ONLY THESE COLORS

### Theme Colors (Dark Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0a0a0f` | Page background |
| `--surface` | `rgba(255,255,255,0.02)` | Card/container background — barely visible |
| `--elevated` | `rgba(255,255,255,0.03)` | Elevated containers (modals, dropdowns) |
| `--text-primary` | `#ffffff` or `rgba(255,255,255,0.92)` | Headlines, key values |
| `--text-secondary` | `rgba(255,255,255,0.55)` | Body text, descriptions |
| `--text-muted` | `rgba(255,255,255,0.35)` | Labels, timestamps, hints |
| `--border` | `rgba(255,255,255,0.03)` | Subtle separators — NEVER solid or visible borders |

### Primary (Green — used sparingly)
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#76b900` | CTAs, active badges, key metrics |
| `--primary-subtle` | `rgba(118,185,0,0.06)` | Active card backgrounds |
| `--primary-border` | `rgba(118,185,0,0.08)` | Active card outlines (barely visible) |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#16a34a` | Confirmations, synced states |
| `--warning` | `#f59e0b` | Alerts, urgency |
| `--error` | `#ef4444` | Errors, failed states |
| `--info` | `#3b82f6` | Informational badges |

### BANNED
- ❌ No bright blue, purple, orange, pink as decorative colors
- ❌ No `border: 1px solid` or `border: 2px solid` on cards/containers
- ❌ No `background: rgba(…, 0.08)` or higher on containers — max 0.03
- ❌ No `linear-gradient` on card backgrounds
- ❌ No glow effects, box shadows with color, or text shadows

---

## Container Rules

### Cards
```css
/* CORRECT */
.card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

/* WRONG — too visible */
.card {
  background: rgba(118, 185, 0, 0.08);
  border: 2px solid var(--primary);
}
```

### Active/Selected Cards
```css
/* CORRECT — subtle highlight */
.card-active {
  background: rgba(118, 185, 0, 0.03);
  border: 1px solid rgba(118, 185, 0, 0.06);
}

/* WRONG — too flashy */
.card-active {
  border: 2px solid #76b900;
  background: rgba(118, 185, 0, 0.1);
}
```

### Separators
```css
/* CORRECT */
border-top: 1px solid rgba(255, 255, 255, 0.03);

/* WRONG */
border-top: 1px solid rgba(255, 255, 255, 0.1);
```

---

## Buttons

### Primary CTA (Green — only for main action)
```css
.btn-primary {
  background: #76b900;
  color: #000;
  border: none;
  font-weight: 700;
  border-radius: 8px;
}
```
- No gradients on buttons. Flat `#76b900`.
- Use sparingly — ONE primary CTA per viewport.

### Secondary
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

---

## Typography
- Font: `Inter` or system sans-serif stack
- Headlines: `font-weight: 700-800`, white
- Body: `font-weight: 400`, `rgba(255,255,255,0.55)`
- Labels/Micro: `font-weight: 600-700`, `rgba(255,255,255,0.35)`, `text-transform: uppercase`, `letter-spacing: 0.05em`

---

## Inline Styles Checklist (for JSX)

Before writing any inline `style={{}}` in React components, verify:

- [ ] Background opacity ≤ 0.02 for containers, ≤ 0.03 for elevated
- [ ] Border opacity ≤ 0.03 (never `1px solid var(--border)` with visible color)
- [ ] Green used ONLY for: CTA buttons, active badges, key metrics
- [ ] No `linear-gradient` on card/container backgrounds
- [ ] No `2px solid` borders on anything except the primary CTA button
- [ ] Text colors use only: white (primary), 0.55 (secondary), 0.35 (muted)

---

## Applies To
- ✅ Dashboard pages (`/dashboard/*`)
- ✅ Admin pages (`/admin`)
- ✅ Public landing page (`/`)
- ✅ Auth pages (`/login`)
- ✅ Onboarding wizard
- ✅ All modals, dropdowns, tooltips
