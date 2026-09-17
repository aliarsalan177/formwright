---
"@formwright/dom": patch
---

The phone field's country list opens in the top layer beside its trigger, so a card, dialog or scrolling container no longer clips it or grows a scrollbar, and opening it scrolls only the list to the selected country instead of the whole page. A press outside now closes the list; the listener that should have done so was only being added when the form was torn down.
