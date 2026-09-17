---
"@formwright/ui": patch
---

Smoother motion: `<fw-accordion-item>` opens with a decelerating height change while its content fades and settles, and closes a little faster (`--fw-disclosure-duration`, default 280ms). `<fw-drawer>` slides in over 340ms and out over 70% of that with matching easing, and only the backdrop fades — the panel stays solid as it moves (`--fw-drawer-duration`). Both stay still under reduced motion.
