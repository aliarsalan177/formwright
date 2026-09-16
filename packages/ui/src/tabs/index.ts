import { define } from "../core/element.js";
import { FwTab } from "./tab.js";
import { FwTabPanel } from "./tab-panel.js";
import { FwTabs } from "./tabs.js";

define("fw-tab", FwTab);
define("fw-tab-panel", FwTabPanel);
define("fw-tabs", FwTabs);

export { FwTab } from "./tab.js";
export { FwTabPanel } from "./tab-panel.js";
export { FwTabs, type TabsActivation, type TabsOrientation, type TabsVariant } from "./tabs.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-tabs": FwTabs;
    "fw-tab": FwTab;
    "fw-tab-panel": FwTabPanel;
  }
}
