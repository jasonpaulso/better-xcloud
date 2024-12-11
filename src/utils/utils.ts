import { AppInterface, SCRIPT_VERSION } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { t, Translations } from "./translation";
import { Toast } from "./toast";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, setPref } from "./settings-storages/global-settings-storage";
import { LocalDb } from "./local-db/local-db";
import { BlockFeature } from "@/enums/pref-values";

/**
 * Check for update
 */
export function checkForUpdate() {
    // Don't check update for beta version
    if (SCRIPT_VERSION.includes('beta')) {
        return;
    }

    const CHECK_INTERVAL_SECONDS = 2 * 3600; // check every 2 hours

    const currentVersion = getPref<VersionCurrent>(PrefKey.VERSION_CURRENT);
    const lastCheck = getPref<VersionLastCheck>(PrefKey.VERSION_LAST_CHECK);
    const now = Math.round((+new Date) / 1000);

    if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS) {
        return;
    }

    // Start checking
    setPref(PrefKey.VERSION_LAST_CHECK, now);
    fetch('https://api.github.com/repos/redphx/better-xcloud/releases/latest')
        .then(response => response.json())
        .then(json => {
            // Store the latest version
            setPref(PrefKey.VERSION_LATEST, json.tag_name.substring(1));
            setPref(PrefKey.VERSION_CURRENT, SCRIPT_VERSION);
        });

    // Update translations
    Translations.updateTranslations(currentVersion === SCRIPT_VERSION);
}


/**
 * Disable PWA requirement on Safari
 */
export function disablePwa() {
    const userAgent = (window.navigator.orgUserAgent || window.navigator.userAgent || '').toLowerCase();
    if (!userAgent) {
        return;
    }

    // Check if it's Safari on mobile
    if (!!AppInterface || UserAgent.isSafariMobile()) {
        // Disable the PWA prompt
        Object.defineProperty(window.navigator, 'standalone', {
            value: true,
        });
    }
}


/**
 * Calculate hash code from a string
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
export function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32-bit integer
    }

    return hash;
}


export function renderString(str: string, obj: any){
    return str.replace(/\$\{.+?\}/g, match => {
        const key = match.substring(2, match.length - 1);
        if (key in obj) {
            return obj[key];
        }

        return match;
    });
}


export function ceilToNearest(value: number, interval: number): number {
    return Math.ceil(value / interval) * interval;
}

export function floorToNearest(value: number, interval: number): number {
    return Math.floor(value / interval) * interval;
}

export function roundToNearest(value: number, interval: number): number {
    return Math.round(value / interval) * interval;
}

export async function copyToClipboard(text: string, showToast=true): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        showToast && Toast.show('Copied to clipboard', '', { instant: true });
        return true;
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast && Toast.show('Failed to copy', '', { instant: true });
    }

    return false;
}

export function productTitleToSlug(title: string): string {
    return title.replace(/[;,/?:@&=+_`~$%#^*()!^\u2122\xae\xa9]/g, '')
            .replace(/\|/g, '-')
            .replace(/ {2,}/g, ' ')
            .trim()
            .substr(0, 50)
            .replace(/ /g, '-')
            .toLowerCase();
}

export function parseDetailsPath(path: string) {
    const matches = /\/games\/(?<titleSlug>[^\/]+)\/(?<productId>\w+)/.exec(path);
    if (!matches?.groups) {
        return;
    }

    const titleSlug = matches.groups.titleSlug!.replaceAll('\%' + '7C', '-');
    const productId = matches.groups.productId;

    return { titleSlug, productId };
}

export function clearAllData() {
    // Delete localStorage items
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) {
            continue;
        }

        // Delete key
        if (key.startsWith('BetterXcloud') || key.startsWith('better_xcloud')) {
            localStorage.removeItem(key);
        }
    }

    // Delete IndexedDB database
    try {
        indexedDB.deleteDatabase(LocalDb.DB_NAME);
    } catch (e) {};

    alert(t('clear-data-success'));
}

export function blockAllNotifications() {
    const blockFeatures = getPref<BlockFeature[]>(PrefKey.BLOCK_FEATURES);
    const blockAll = [BlockFeature.FRIENDS, BlockFeature.NOTIFICATIONS_ACHIEVEMENTS, BlockFeature.NOTIFICATIONS_INVITES].every(value => blockFeatures.includes(value));
    return blockAll;
}

export function blockSomeNotifications() {
    const blockFeatures = getPref<BlockFeature[]>(PrefKey.BLOCK_FEATURES);
    if (blockAllNotifications()) {
        return false;
    }

    const blockSome = [BlockFeature.FRIENDS, BlockFeature.NOTIFICATIONS_ACHIEVEMENTS, BlockFeature.NOTIFICATIONS_INVITES].some(value => blockFeatures.includes(value));
    return blockSome;
}
