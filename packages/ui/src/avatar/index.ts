import { define } from "../core/element.js";
import { FwAvatar } from "./avatar.js";
import { FwAvatarGroup } from "./avatar-group.js";

define("fw-avatar", FwAvatar);
define("fw-avatar-group", FwAvatarGroup);

export {
  FwAvatar,
  hueOf,
  initialsOf,
  type AvatarShape,
  type AvatarSize,
  type AvatarStatus,
} from "./avatar.js";
export { FwAvatarGroup } from "./avatar-group.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-avatar": FwAvatar;
    "fw-avatar-group": FwAvatarGroup;
  }
}
