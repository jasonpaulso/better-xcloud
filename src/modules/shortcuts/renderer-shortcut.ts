import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { limitVideoPlayerFps } from "../stream/stream-settings-utils";
import { BxEventBus } from "@/utils/bx-event-bus";

export class RendererShortcut {
    static toggleVisibility() {
        const $mediaContainer = document.querySelector('#game-stream div[data-testid="media-container"]');
        if (!$mediaContainer) {
            BxEventBus.Stream.emit('video.visibility.changed', { isVisible: true });
            return;
        }

        $mediaContainer.classList.toggle('bx-gone');
        const isVisible = !$mediaContainer.classList.contains('bx-gone');

        // Switch FPS
        limitVideoPlayerFps(isVisible ? getPref(PrefKey.VIDEO_MAX_FPS) : 0);
        BxEventBus.Stream.emit('video.visibility.changed', { isVisible });
    }
}
