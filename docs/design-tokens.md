# Design tokens (from Lightfield)

Measured from the live Lightfield app (crm.lightfield.app) on 3 Nov 2026
with the browser's computed styles. The tokens live in
`src/app/globals.css`; use the Tailwind names below rather than raw colours.

## Colour

| Token | Value | Tailwind | Used for |
| --- | --- | --- | --- |
| canvas | oklch(0.9851 0 0) ≈ #fafafa | `bg-canvas` | Page background, table cells |
| sidebar | oklch(0.9702 0 0) ≈ #f5f5f5 | `bg-sidebar` | Sidebar |
| surface | oklch(1 0 0) white | `bg-surface` | Cards, popups, Ask bar, default buttons |
| ink | black at 85% | `text-ink` | Primary text |
| ink-2 | black at 75% | `text-ink-2` | Sidebar items |
| ink-3 | black at 60% | `text-ink-3` | Section labels, icons |
| ink-4 | black at 50% | `text-ink-4` | Table headers, meta text |
| ink-5 | black at 40% | `text-ink-5` | Placeholders, disabled |
| line | black at 12% | `border-line` | Every border |
| hover | black at 4% | `bg-hover` | Hover, active sidebar item, active tab |

Chip tints (text on a ~10% tint), e.g. Lightfield's green industry chip:
text rgb(29, 87, 30) on oklch(0.6593 0.1841 143.49 / 0.1). We add blue,
orange, red and purple in the same style.

## Type

- Font: the system UI stack (`ui-sans-serif, system-ui, sans-serif`), no web font
- Body, table cells, sidebar items: 13px. Sidebar items weight 425, active
  item and cell names 500
- Buttons, chips, section labels: 12px, weight 500
- Table headers: 13px, weight 425, ink-4
- Ask bar input: 15px

## Shape and spacing

- Borders: **0.5px** hairlines everywhere (`hairline` class)
- Radius: 6px for buttons, chips, sidebar items; 10px for the Ask bar and popups
- Buttons: 24px tall, padding 2px 7px
- Sidebar: 268px wide, items 32px tall with 6px padding, 0.5px right border
- Table rows: 44px tall, 0.5px bottom and right borders
- Top bar: about 40px tall

## Shadow

- Default button: 0 1px 3px black at 4%
- Ask bar and floating menus: 0 8px 24px black at 6%

## Components that follow these rules

| Component | File |
| --- | --- |
| Sidebar | `src/components/shell/sidebar.tsx` |
| Ask bar | `src/components/shell/ask-bar.tsx` |
| Table view | `src/components/table/data-table.tsx` |
| Record page | `src/components/record/record-view.tsx` |
| Popup (task adder) | `src/components/popup/popup.tsx` |
| Buttons, chips, menus | `src/components/ui/primitives.tsx` |
