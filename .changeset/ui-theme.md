---
"@formwright/ui": minor
---

New `@formwright/ui/theme`: `createTheme(options, { target? })` themes every component at runtime from a few choices — an accent, optional colours (neutrals, tones and contrast text are derived), radius, density, shadow, font, font size and motion — with light, dark and system modes. `theme.update()` and `theme.setMode()` restyle the page at once; a theme can be scoped to one element; `themeToCss()` renders the same CSS for a server to inline; `presets` offers ocean, forest, rose and mono starting points.
