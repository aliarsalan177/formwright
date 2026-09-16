---
"@formwright/ui": patch
---

Toasts stay clickable while a `<fw-dialog>`, `<fw-drawer>` or `<fw-command-palette>` is open: the toast region moves inside the innermost open modal and back when it closes, with countdowns carrying on. `<fw-command-palette>` now ranks results by moving them in the page rather than with CSS `order`, so screen readers read them in the order shown; the authored order returns when the search clears or the palette closes.
