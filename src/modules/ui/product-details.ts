import { BX_FLAGS } from "@/utils/bx-flags";
import { BxIcon } from "@/utils/bx-icon";
import { AppInterface } from "@/utils/global";
import { ButtonStyle, CE, createButton } from "@/utils/html";
import { t } from "@/utils/translation";

export class ProductDetailsPage {
    private static $btnShortcut = AppInterface && createButton({
        icon: BxIcon.CREATE_SHORTCUT,
        label: t('create-shortcut'),
        style: ButtonStyle.FOCUSABLE,
        tabIndex: 0,
        onClick: e => {
            AppInterface.createShortcut(window.location.pathname.substring(6));
        },
    });

    private static $btnWallpaper = AppInterface && createButton({
        icon: BxIcon.DOWNLOAD,
        label: t('wallpaper'),
        style: ButtonStyle.FOCUSABLE,
        tabIndex: 0,
        onClick: async e => {
            try {
                const matches = /\/games\/(?<titleSlug>[^\/]+)\/(?<productId>\w+)/.exec(window.location.pathname);
                if (!matches?.groups) {
                    return;
                }

                const titleSlug = matches.groups.titleSlug.replaceAll('\%' + '7C', '-');
                const productId = matches.groups.productId;
                AppInterface.downloadWallpapers(titleSlug, productId);
            } catch (e) {}
        },
    });

    private static injectTimeoutId: number | null = null;

    static injectButtons() {
        if (!AppInterface) {
            return;
        }

        ProductDetailsPage.injectTimeoutId && clearTimeout(ProductDetailsPage.injectTimeoutId);
        ProductDetailsPage.injectTimeoutId = window.setTimeout(() => {
            // Find action buttons container
            const $container = document.querySelector('div[class*=ActionButtons-module__container]');
            if ($container && $container.parentElement) {
                $container.parentElement.appendChild(CE('div', {
                    class: 'bx-product-details-buttons',
                },
                    BX_FLAGS.DeviceInfo.deviceType === 'android' && ProductDetailsPage.$btnShortcut,
                    ProductDetailsPage.$btnWallpaper,
                ));
            }
        }, 500);
    }
}
