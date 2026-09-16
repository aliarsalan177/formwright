import { define } from "../core/element.js";
import { FwCommandGroup } from "./command-group.js";
import { FwCommandPalette } from "./command-palette.js";
import { FwCommand } from "./command.js";

define("fw-command", FwCommand);
define("fw-command-group", FwCommandGroup);
define("fw-command-palette", FwCommandPalette);

export { FwCommand } from "./command.js";
export { FwCommandGroup } from "./command-group.js";
export { FwCommandPalette, parseHotkey, type CommandSelectDetail } from "./command-palette.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-command-palette": FwCommandPalette;
    "fw-command": FwCommand;
    "fw-command-group": FwCommandGroup;
  }
}
