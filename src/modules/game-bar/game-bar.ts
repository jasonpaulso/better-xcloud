import { CE, createSvgIcon } from "@utils/html";
import { ScreenshotAction } from "./screenshot-action";
import { TouchControlAction } from "./touch-control-action";
import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import type { BaseGameBarAction } from "./base-action";
import { STATES } from "@utils/global";
import { MicrophoneAction } from "./microphone-action";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { TrueAchievementsAction } from "./true-achievements-action";
import { SpeakerAction } from "./speaker-action";
import { RendererAction } from "./renderer-action";
import { BxLogger } from "@/utils/bx-logger";
import { GameBarPosition, TouchControllerMode } from "@/enums/pref-values";


export class GameBar {
    private static instance: GameBar | null | undefined;
    public static getInstance(): typeof GameBar['instance'] {
        if (typeof GameBar.instance === 'undefined') {
            if (getPref<GameBarPosition>(PrefKey.GAME_BAR_POSITION) !== GameBarPosition.OFF) {
                GameBar.instance = new GameBar();
            } else {
                GameBar.instance = null;
            }
        }

        return GameBar.instance;
    }

    private readonly LOG_TAG = 'GameBar';

    private static readonly VISIBLE_DURATION = 2000;

    private $gameBar: HTMLElement;
    private $container: HTMLElement;

    private timeoutId: number | null = null;

    private actions: BaseGameBarAction[] = [];

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        let $container;

        const position = getPref<GameBarPosition>(PrefKey.GAME_BAR_POSITION);

        const $gameBar = CE('div', {id: 'bx-game-bar', class: 'bx-gone', 'data-position': position},
            $container = CE('div', {class: 'bx-game-bar-container bx-offscreen'}),
            createSvgIcon(position === 'bottom-left' ? BxIcon.CARET_RIGHT : BxIcon.CARET_LEFT),
        );

        this.actions = [
            new ScreenshotAction(),
            ...(STATES.userAgent.capabilities.touch && (getPref<TouchControllerMode>(PrefKey.TOUCH_CONTROLLER_MODE) !== TouchControllerMode.OFF) ? [new TouchControlAction()] : []),
            new SpeakerAction(),
            new RendererAction(),
            new MicrophoneAction(),
            new TrueAchievementsAction(),
        ];

        // Reverse the action list if Game Bar's position is on the right side
        if (position === 'bottom-right') {
            this.actions.reverse();
        }

        // Render actions
        for (const action of this.actions) {
            $container.appendChild(action.render());
        }

        // Toggle game bar when clicking on the game bar box
        $gameBar.addEventListener('click', e => {
            if (e.target !== $gameBar) {
                return;
            }

            $container.classList.contains('bx-show') ? this.hideBar() : this.showBar();
        });

        // Hide game bar after clicking on an action
        window.addEventListener(BxEvent.GAME_BAR_ACTION_ACTIVATED, this.hideBar);

        $container.addEventListener('pointerover', this.clearHideTimeout);
        $container.addEventListener('pointerout', this.beginHideTimeout);

        // Add animation when hiding game bar
        $container.addEventListener('transitionend', e => {
            $container.classList.replace('bx-hide', 'bx-offscreen');
        });

        document.documentElement.appendChild($gameBar);
        this.$gameBar = $gameBar;
        this.$container = $container;

        // Enable/disable Game Bar when playing/pausing
        position !== GameBarPosition.OFF && window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, ((e: Event) => {
            // Toggle Game bar
            if (STATES.isPlaying) {
                window.BX_STREAM_SETTINGS.xCloudPollingMode !== 'none' ? this.disable() : this.enable();
            }
        }).bind(this));
    }

    private beginHideTimeout = () => {
        this.clearHideTimeout();

        this.timeoutId = window.setTimeout(() => {
            this.timeoutId = null;
            this.hideBar();
        }, GameBar.VISIBLE_DURATION);
    }

    private clearHideTimeout = () => {
        this.timeoutId && clearTimeout(this.timeoutId);
        this.timeoutId = null;
    }

    enable() {
        this.$gameBar.classList.remove('bx-gone');
    }

    disable() {
        this.hideBar();
        this.$gameBar.classList.add('bx-gone');
    }

    showBar() {
        this.$container.classList.remove('bx-offscreen', 'bx-hide' , 'bx-gone');
        this.$container.classList.add('bx-show');

        this.beginHideTimeout();
    }

    hideBar = () => {
        this.clearHideTimeout();
        this.$container.classList.replace('bx-show', 'bx-hide');
    }

    // Reset all states
    reset() {
        for (const action of this.actions) {
            action.reset();
        }
    }
}
