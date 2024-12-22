import { isFullVersion } from "@macros/build" with { type: "macro" };

import { BxEvent } from "@/utils/bx-event";
import { AppInterface, STATES } from "@/utils/global";
import { createButton, ButtonStyle, CE } from "@/utils/html";
import { t } from "@/utils/translation";
import { SettingsDialog } from "./dialog/settings-dialog";
import { TrueAchievements } from "@/utils/true-achievements";
import { BxIcon } from "@/utils/bx-icon";
import { BxEventBus } from "@/utils/bx-event-bus";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { UiLayout } from "@/enums/pref-values";
import { PrefKey } from "@/enums/pref-keys";

export enum GuideMenuTab {
    HOME = 'home',
}

export class GuideMenu {
    private static instance: GuideMenu;
    public static getInstance = () => GuideMenu.instance ?? (GuideMenu.instance = new GuideMenu());

    private $renderedButtons?: HTMLElement;

    closeGuideMenu() {
        if (window.BX_EXPOSED.dialogRoutes) {
            window.BX_EXPOSED.dialogRoutes.closeAll();
            return;
        }

        // Use alternative method for Lite version
        const $btnClose = document.querySelector<HTMLElement>('#gamepass-dialog-root button[class^=Header-module__closeButton]');
        $btnClose && $btnClose.click();
    }

    private renderButtons() {
        if (this.$renderedButtons) {
            return this.$renderedButtons;
        }

        const buttons = {
            scriptSettings: createButton({
                label: t('better-xcloud'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY,
                onClick: () => {
                    // Wait until the Guide dialog is closed
                    BxEventBus.Script.once('dialog.dismissed', () => {
                        setTimeout(() => SettingsDialog.getInstance().show(), 50);
                    });

                    // Close all xCloud's dialogs
                    this.closeGuideMenu();
                },
            }),

            closeApp: AppInterface && createButton({
                icon: BxIcon.POWER,
                label: t('close-app'),
                title: t('close-app'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
                onClick: e => {
                    AppInterface.closeApp();
                },

                attributes: {
                    'data-state': 'normal',
                },
            }),

            reloadPage: createButton({
                icon: BxIcon.REFRESH,
                label: t('reload-page'),
                title: t('reload-page'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                onClick: () => {
                    // Close all xCloud's dialogs
                    this.closeGuideMenu();

                    if (STATES.isPlaying) {
                        confirm(t('confirm-reload-stream')) && window.location.reload();
                    } else {
                        window.location.reload();
                    }
                },
            }),

            backToHome: createButton({
                icon: BxIcon.HOME,
                label: t('back-to-home'),
                title: t('back-to-home'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                onClick: () => {
                    // Close all xCloud's dialogs
                    this.closeGuideMenu();

                    confirm(t('back-to-home-confirm')) && (window.location.href = window.location.href.substring(0, 31));
                },
                attributes: {
                    'data-state': 'playing',
                },
            }),
        };

        const buttonsLayout = [
            buttons.scriptSettings,
            [
                buttons.backToHome,
                buttons.reloadPage,
                buttons.closeApp,
            ],
        ];

        const $div = CE('div', {
            class: 'bx-guide-home-buttons',
        });

        // Set TV tag
        if (STATES.userAgent.isTv || getPref(PrefKey.UI_LAYOUT) === UiLayout.TV) {
            document.body.dataset.bxMediaType = 'tv';
        }

        for (const $button of buttonsLayout) {
            if (!$button) {
                continue;
            }

            if ($button instanceof HTMLElement) {
                $div.appendChild($button);
            } else if (Array.isArray($button)) {
                const $wrapper = CE('div', {});
                for (const $child of $button) {
                    $child && $wrapper.appendChild($child);
                }
                $div.appendChild($wrapper);
            }
        }

        this.$renderedButtons = $div;
        return $div;
    }

    injectHome($root: HTMLElement, isPlaying = false) {
        if (isFullVersion()) {
            const $achievementsProgress = $root.querySelector('button[class*=AchievementsButton-module__progressBarContainer]');
            if ($achievementsProgress) {
                TrueAchievements.getInstance().injectAchievementsProgress($achievementsProgress as HTMLElement);
            }
        }

        // Find the element to add buttons to
        let $target: HTMLElement | null = null;
        if (isPlaying) {
            // Quit button
            $target = $root.querySelector('a[class*=QuitGameButton]');

            // Hide xCloud's Home button
            const $btnXcloudHome = $root.querySelector<HTMLElement>('div[class^=HomeButtonWithDivider]');
            $btnXcloudHome && ($btnXcloudHome.style.display = 'none');
        } else {
            // Last divider
            const $dividers = $root.querySelectorAll('div[class*=Divider-module__divider]');
            if ($dividers) {
                $target = $dividers[$dividers.length - 1] as HTMLElement;
            }
        }

        if (!$target) {
            return false;
        }

        const $buttons = this.renderButtons();
        $buttons.dataset.isPlaying = isPlaying.toString();
        $target.insertAdjacentElement('afterend', $buttons);
    }

    private onShown = async (e: Event) => {
        const where = (e as any).where as GuideMenuTab;

        if (where === GuideMenuTab.HOME) {
            const $root = document.querySelector<HTMLElement>('#gamepass-dialog-root div[role=dialog] div[role=tabpanel] div[class*=HomeLandingPage]');
            $root && this.injectHome($root, STATES.isPlaying);
        }
    }

    addEventListeners() {
        window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, this.onShown);
    }

    observe($addedElm: HTMLElement) {
        let className = $addedElm.className;

        // Fix custom buttons disappearing in Guide Menu (#551)
        if (!className) {
            className = $addedElm.firstElementChild?.className ?? '';
        }

        if (!className || className.startsWith('bx-')) {
            return;
        }

        // TrueAchievements
        if (isFullVersion() && className.includes('AchievementsButton-module__progressBarContainer')) {
            TrueAchievements.getInstance().injectAchievementsProgress($addedElm);
            return;
        }

        if (!className.startsWith('NavigationAnimation') &&
                !className.startsWith('DialogRoutes') &&
                !className.startsWith('Dialog-module__container')) {
            return;
        }

        // Achievement Details page
        if (isFullVersion()) {
            const $achievDetailPage = $addedElm.querySelector('div[class*=AchievementDetailPage]');
            if ($achievDetailPage) {
                TrueAchievements.getInstance().injectAchievementDetailPage($achievDetailPage as HTMLElement);
                return;
            }
        }

        // Find navigation bar
        const $selectedTab = $addedElm.querySelector('div[class^=NavigationMenu] button[aria-selected=true');
        if ($selectedTab) {
            let $elm: Element | null = $selectedTab;
            let index;
            for (index = 0; ($elm = $elm?.previousElementSibling); index++);

            if (index === 0) {
                BxEvent.dispatch(window, BxEvent.XCLOUD_GUIDE_MENU_SHOWN, { where: GuideMenuTab.HOME });
            }
        }
    }
}
