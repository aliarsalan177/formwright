---
"@formwright/ui": minor
---

New `<fw-list>` and `<fw-list-item>` (`@formwright/ui/list`). A list item is one row — `prefix` (icon or avatar), label, `description`, `suffix` (badge, count, shortcut) — that works on its own, as a link (`href`) or action (`interactive`), inside `<fw-list>` (plain, or a single or multiple selection that submits with a form, with roving focus and typeahead), and inside `<fw-select>`, `<fw-combobox>`, `<fw-multi-select>` and `<fw-dropdown>` as an option or menu item. `<fw-option>` and `<fw-menu-item>` are built on the same row, so they gain `description` and `size` and every list looks alike. `FwItemBase` and `itemStyles` are exported from `@formwright/ui/core`.
