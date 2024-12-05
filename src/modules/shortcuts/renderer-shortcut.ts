import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { limitVideoPlayerFps } from "../stream/stream-settings-utils";
import { BxEvent } from "@/utils/bx-event";

export class RendererShortcut {
    static toggleVisibility() {
        const $mediaContainer = document.querySelector('#game-stream div[data-testid="media-container"]');
        if (!$mediaContainer) {
            BxEvent.dispatch(window, BxEvent.VIDEO_VISIBILITY_CHANGED, { isShowing: true });
            return;
        }

        $mediaContainer.classList.toggle('bx-gone');
        const isShowing = !$mediaContainer.classList.contains('bx-gone');

        // Switch FPS
        limitVideoPlayerFps(isShowing ? getPref(PrefKey.VIDEO_MAX_FPS) : 0);
        BxEvent.dispatch(window, BxEvent.VIDEO_VISIBILITY_CHANGED, { isShowing });
    }
}
