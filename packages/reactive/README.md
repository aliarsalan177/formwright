# @formwright/reactive

Tiny, dependency-free signals shared by [Formwright](https://github.com/aliarsalan177/formwright), Gridwright, and Overlaywright.

```bash
npm install @formwright/reactive
```

## Quick start

```ts
import { batch, computed, effect, signal } from "@formwright/reactive";

const firstName = signal("Ada");
const lastName = signal("Lovelace");
const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);

const stop = effect(() => {
  console.log(fullName.get());
});

batch(() => {
  firstName.set("Grace");
  lastName.set("Hopper");
});

stop();
```

Effects run immediately and update synchronously. Computed values are lazy and cached. Use `untrack` to read without subscribing and dispose every long-lived effect when its owner is destroyed.

## API

- `signal(initial)` — writable reactive value
- `computed(fn)` — lazy derived value
- `effect(fn)` — reactive side effect with optional cleanup
- `batch(fn)` — group writes into one effect flush
- `untrack(fn)` — read without recording dependencies
- `isTracking()` — detect an active reactive context

## License

MIT
