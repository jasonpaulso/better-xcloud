import { StorageKey } from "@/enums/pref-keys";
import { NATIVE_FETCH } from "./bx-flags";
import { BxLogger } from "./bx-logger";
import { BxEventBus } from "./bx-event-bus";


export class GhPagesUtils {
    static fetchLatestCommit() {
        const url = 'https://api.github.com/repos/redphx/better-xcloud/branches/gh-pages';

        NATIVE_FETCH(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
            },
        })
            .then(response => response.json())
            .then(data => {
                const latestCommitHash = data.commit.sha;
                window.localStorage.setItem(StorageKey.GH_PAGES_COMMIT_HASH, latestCommitHash);
            }).catch(error => {
                BxLogger.error('GhPagesUtils', 'Error fetching the latest commit:', error);
            });
    }

    static getUrl(path: string): string {
        if (path[0] === '/') {
            alert('`path` must not starts with "/"');
        }

        const prefix = 'https://raw.githubusercontent.com/redphx/better-xcloud';
        const latestCommitHash = window.localStorage.getItem(StorageKey.GH_PAGES_COMMIT_HASH);
        if (latestCommitHash) {
            return `${prefix}/${latestCommitHash}/${path}`;
        } else {
            return `${prefix}/refs/heads/gh-pages/${path}`;
        }
    }

    static getNativeMkbCustomList(update=false): ForceNativeMkbResponse['data'] {
        const supportedSchema = 1;
        const key = StorageKey.LIST_FORCE_NATIVE_MKB;

        // Update IDs in the background
        update && NATIVE_FETCH(GhPagesUtils.getUrl('native-mkb/ids.json'))
            .then(response => response.json())
            .then((json: ForceNativeMkbResponse) => {
                if (json.$schemaVersion === supportedSchema) {
                    // Save to storage
                    window.localStorage.setItem(key, JSON.stringify(json));
                    BxEventBus.Script.emit('list.forcedNativeMkb.updated', {
                        data: json,
                    });
                } else {
                    window.localStorage.removeItem(key);
                }
            });

        const info = JSON.parse(window.localStorage.getItem(key) || '{}');
        if (info.$schemaVersion !== supportedSchema) {
            // Delete storage;
            window.localStorage.removeItem(key);
            return {};
        }

        return info.data;
    }

    static getTouchControlCustomList() {
        // TODO: use Set()
        const key = StorageKey.LIST_CUSTOM_TOUCH_LAYOUTS;

        NATIVE_FETCH(GhPagesUtils.getUrl('touch-layouts/ids.json'))
            .then(response => response.json())
            .then(json => {
                if (Array.isArray(json)) {
                    window.localStorage.setItem(key, JSON.stringify(json));
                }
            });

        const customList = JSON.parse(window.localStorage.getItem(key) || '[]');
        return customList;
    }

    static getLocalCoOpList(): Set<string> {
        const supportedSchema = 1;
        const key = StorageKey.LIST_LOCAL_CO_OP;

        NATIVE_FETCH(GhPagesUtils.getUrl('local-co-op/ids.json'))
            .then(response => response.json())
            .then(json => {
                if (json.$schemaVersion === supportedSchema) {
                    window.localStorage.setItem(key, JSON.stringify(json));
                    const ids = new Set(Object.keys(json.data));
                    BxEventBus.Script.emit('list.localCoOp.updated', { ids });
                } else {
                    window.localStorage.removeItem(key);
                    BxEventBus.Script.emit('list.localCoOp.updated', { ids: new Set() });
                }
            });

        const info = JSON.parse(window.localStorage.getItem(key) || '{}');
        if (info.$schemaVersion !== supportedSchema) {
            // Delete storage;
            window.localStorage.removeItem(key);
            return new Set();
        }

        return new Set(Object.keys(info.data || {}));
    }
}
