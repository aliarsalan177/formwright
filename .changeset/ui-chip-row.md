---
"@formwright/ui": patch
---

Chips in `<fw-multi-select>` and `<fw-tags-input>` stay on one row and scroll sideways instead of wrapping, so the field keeps the height of an `<fw-input>` however many are chosen, and the newest chip scrolls into view. The new `wrap` attribute goes back to filling rows.
