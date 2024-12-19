import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";

export class MouseCursorHider {
    private static instance: MouseCursorHider | null | undefined;
    public static getInstance(): typeof MouseCursorHider['instance'] {
        if (typeof MouseCursorHider.instance === 'undefined') {
            if (!getPref(PrefKey.MKB_ENABLED) && getPref(PrefKey.MKB_HIDE_IDLE_CURSOR)) {
                MouseCursorHider.instance = new MouseCursorHider();
            } else {
                MouseCursorHider.instance = null;
            }
        }

        return MouseCursorHider.instance;
    }

    private timeoutId!: number | null;
    private isCursorVisible = true;

    show() {
        document.body && (document.body.style.cursor = 'unset');
        this.isCursorVisible = true;
    }

    hide() {
        document.body && (document.body.style.cursor = 'none');
        this.timeoutId = null;
        this.isCursorVisible = false;
    }

    onMouseMove = (e: MouseEvent) => {
        // Toggle cursor
        !this.isCursorVisible && this.show();
        // Setup timeout
        this.timeoutId && clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(this.hide, 3000);
    }

    start() {
        this.show();
        document.addEventListener('mousemove', this.onMouseMove);
    }

    stop() {
        this.timeoutId && clearTimeout(this.timeoutId);
        this.timeoutId = null;

        document.removeEventListener('mousemove', this.onMouseMove);
        this.show();
    }
}
