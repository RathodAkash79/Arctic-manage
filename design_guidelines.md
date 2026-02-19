# UI/UX Design System & Aesthetics

## 1. Design Philosophy
**Keywords:** Calm, Minimal, Professional, Distraction-Free, "Serious Productivity".
**Goal:** Reduce cognitive load. The UI should fade into the background, letting the data/tasks take center stage. Avoid "gamified" or "playful" elements.

## 2. Color Palette (Tailwind CSS)
We are avoiding bright, saturated colors. We use "Muted" and "Slate" tones to maintain a serious, enterprise feel.

### A. Core Backgrounds & Text
* **Page Background:** `bg-slate-50` (Not pure white, easier on eyes).
* **Card/Panel Background:** `bg-white` (Clean contrast).
* **Primary Text:** `text-slate-900` (Deep grey, almost black).
* **Secondary Text:** `text-slate-500` (For timestamps, non-critical info).
* **Borders:** `border-slate-200` (Subtle separation).

### B. Action Colors
* **Primary Button:** `bg-slate-900 text-white hover:bg-slate-800` (Solid, authoritative).
* **Secondary Button:** `bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`.
* **Destructive/Ban:** `text-red-600 hover:bg-red-50` (Minimal, no big red buttons unless confirming).

### C. Status Indicators (Pastel/Muted)
Never use neon green or bright red. Use these specific Tailwind combinations for badges/tags:
* **Done/Completed:** `bg-emerald-50 text-emerald-700 border border-emerald-100`
* **In Progress:** `bg-blue-50 text-blue-700 border border-blue-100`
* **Pending/Todo:** `bg-slate-100 text-slate-600 border border-slate-200`
* **Review:** `bg-amber-50 text-amber-700 border border-amber-100`
* **Blocked/High Priority:** `bg-rose-50 text-rose-700 border border-rose-100`

## 3. Typography
**Font Family:** `Inter` (Google Font) or System Sans-serif.
**Weights:**
* **Headings:** `font-semibold tracking-tight` (Tight tracking makes it look more modern/premium).
* **Body:** `font-normal`.
* **Data/Numbers:** `font-medium` or `font-mono` (for IDs or dates).

## 4. Components & Layout Style

### A. Cards & Containers
* **Shape:** `rounded-lg` (Standard rounded, not too round like a toy).
* **Depth:** `shadow-sm` or `border border-slate-200`. Avoid large `shadow-xl`.
* **Hover:** `hover:border-slate-300 transition-colors duration-200`.

### B. Navigation (Sidebar)
* **Style:** Vertical Sidebar on desktop, collapsible.
* **Active State:** `bg-slate-100 text-slate-900 font-medium`.
* **Inactive State:** `text-slate-500 hover:text-slate-900`.

### C. Task List / Tables
* **Row Style:** Minimal height, `border-b border-slate-100`.
* **Hover:** `hover:bg-slate-50/50`.
* **Spacing:** `p-4` (Generous padding to let content breathe).

## 5. Animation Guidelines
**Rule:** "Invisible unless necessary."
* **Duration:** `duration-200`.
* **Easing:** `ease-out`.
* **Interactions:**
    * **Buttons:** Slight color shift (`hover:bg-slate-800`). No scale/bounce effect.
    * **Modals:** Simple `opacity-0` to `opacity-100` with a tiny `scale-95` to `scale-100` transition.
    * **Task Dragging (if applicable):** Instant snap, no wobbly physics.

## 6. Iconography
**Library:** Lucide React.
**Style:**
* **Stroke Width:** `1.5px` (Thin, elegant lines).
* **Size:** `w-4 h-4` (Small, unobtrusive) for metadata; `w-5 h-5` for navigation.
