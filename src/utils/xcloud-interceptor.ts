import { isFullVersion } from "@macros/build" with {type: "macro"};

import { LoadingScreen } from "@modules/loading-screen";
import { RemotePlayManager } from "@/modules/remote-play-manager";
import { StreamBadges } from "@modules/stream/stream-badges";
import { TouchController } from "@modules/touch-controller";
import { BxEvent } from "./bx-event";
import { NATIVE_FETCH, BX_FLAGS } from "./bx-flags";
import { STATES } from "./global";
import { patchIceCandidates } from "./network";
import { getPreferredServerRegion } from "./region";
import { BypassServerIps } from "@/enums/bypass-servers";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, StreamResolution, StreamTouchController } from "./settings-storages/global-settings-storage";

export class XcloudInterceptor {
    private static readonly SERVER_EXTRA_INFO: Record<string, [string, ServerContinent]> = {
        // North America
        EastUS: ['🇺🇸', 'america-north'],
        EastUS2: ['🇺🇸', 'america-north'],
        NorthCentralUs: ['🇺🇸', 'america-north'],
        SouthCentralUS: ['🇺🇸', 'america-north'],
        WestUS: ['🇺🇸', 'america-north'],
        WestUS2: ['🇺🇸', 'america-north'],
        MexicoCentral: ['🇲🇽', 'america-north'],

        // South America
        BrazilSouth: ['🇧🇷', 'america-south'],

        // Asia
        JapanEast: ['🇯🇵', 'asia'],
        KoreaCentral: ['🇰🇷', 'asia'],

        // Australia
        AustraliaEast: ['🇦🇺', 'australia'],
        AustraliaSouthEast: ['🇦🇺', 'australia'],

        // Europe
        SwedenCentral: ['🇸🇪', 'europe'],
        UKSouth: ['🇬🇧', 'europe'],
        WestEurope: ['🇪🇺', 'europe'],
    };

    private static async handleLogin(request: RequestInfo | URL, init?: RequestInit) {
        const bypassServer = getPref(PrefKey.SERVER_BYPASS_RESTRICTION);
        if (bypassServer !== 'off') {
            const ip = BypassServerIps[bypassServer as keyof typeof BypassServerIps];
            ip && (request as Request).headers.set('X-Forwarded-For', ip);
        }

        const response = await NATIVE_FETCH(request, init);
        if (response.status !== 200) {
            // Unsupported region
            BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_UNAVAILABLE);
            return response;
        }

        const obj = await response.clone().json();

        // Store xCloud token
        RemotePlayManager.getInstance().xcloudToken = obj.gsToken;

        // Get server list
        const serverRegex = /\/\/(\w+)\./;
        const serverExtra = XcloudInterceptor.SERVER_EXTRA_INFO;

        let region: ServerRegion;
        for (region of obj.offeringSettings.regions) {
            const regionName = region.name as keyof typeof serverExtra;
            let shortName = region.name;

            if (region.isDefault) {
                STATES.selectedRegion = Object.assign({}, region);
            }

            let match = serverRegex.exec(region.baseUri);
            if (match) {
                shortName = match[1];
                if (serverExtra[regionName]) {
                    shortName = serverExtra[regionName][0] + ' ' + shortName;
                    region.contintent = serverExtra[regionName][1];
                } else {
                    region.contintent = 'other';
                }
            }

            region.shortName = shortName.toUpperCase();
            STATES.serverRegions[region.name] = Object.assign({}, region);
        }

        BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_READY);

        const preferredRegion = getPreferredServerRegion();
        if (preferredRegion && preferredRegion in STATES.serverRegions) {
            const tmp = Object.assign({}, STATES.serverRegions[preferredRegion]);
            tmp.isDefault = true;

            obj.offeringSettings.regions = [tmp];
            STATES.selectedRegion = tmp;
        }

        STATES.gsToken = obj.gsToken;

        response.json = () => Promise.resolve(obj);
        return response;
    }

    private static async handlePlay(request: RequestInfo | URL, init?: RequestInit) {
        BxEvent.dispatch(window, BxEvent.STREAM_LOADING);

        const PREF_STREAM_TARGET_RESOLUTION = getPref(PrefKey.STREAM_TARGET_RESOLUTION);
        const PREF_STREAM_PREFERRED_LOCALE = getPref(PrefKey.STREAM_PREFERRED_LOCALE);

        const url = (typeof request === 'string') ? request : (request as Request).url;
        const parsedUrl = new URL(url);

        let badgeRegion: string = parsedUrl.host.split('.', 1)[0];
        for (let regionName in STATES.serverRegions) {
            const region = STATES.serverRegions[regionName];
            if (parsedUrl.origin == region.baseUri) {
                badgeRegion = regionName;
                break;
            }
        }
        StreamBadges.getInstance().setRegion(badgeRegion);

        const clone = (request as Request).clone();
        const body = await clone.json();

        // Force stream's resolution
        if (PREF_STREAM_TARGET_RESOLUTION !== 'auto') {
            const osName = (PREF_STREAM_TARGET_RESOLUTION === StreamResolution.DIM_720P) ? 'android' : 'windows';
            body.settings.osName = osName;
        }

        // Override "locale" value
        if (PREF_STREAM_PREFERRED_LOCALE !== 'default') {
            body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
        }

        const newRequest = new Request(request, {
            body: JSON.stringify(body),
        });

        return NATIVE_FETCH(newRequest);
    }

    private static async handleWaitTime(request: RequestInfo | URL, init?: RequestInit) {
        const response = await NATIVE_FETCH(request, init);

        if (getPref(PrefKey.UI_LOADING_SCREEN_WAIT_TIME)) {
            const json = await response.clone().json();
            if (json.estimatedAllocationTimeInSeconds > 0) {
                // Setup wait time overlay
                LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
            }
        }

        return response;
    }

    private static async handleConfiguration(request: RequestInfo | URL, init?: RequestInit) {
        if ((request as Request).method !== 'GET') {
            return NATIVE_FETCH(request, init);
        }

        // Touch controller for all games
        if (isFullVersion() && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === StreamTouchController.ALL) {
            const titleInfo = STATES.currentStream.titleInfo;
            if (titleInfo?.details.hasTouchSupport) {
                TouchController.disable();
            } else {
                TouchController.enable();
            }
        }

        // Intercept configurations
        const response = await NATIVE_FETCH(request, init);
        const text = await response.clone().text();
        if (!text.length) {
            return response;
        }

        BxEvent.dispatch(window, BxEvent.STREAM_STARTING);

        const obj = JSON.parse(text);
        let overrides = JSON.parse(obj.clientStreamingConfigOverrides || '{}') || {};

        overrides.inputConfiguration = overrides.inputConfiguration || {};
        overrides.inputConfiguration.enableVibration = true;

        let overrideMkb: boolean | null = null;

        if (getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' || (STATES.currentStream.titleInfo && BX_FLAGS.ForceNativeMkbTitles?.includes(STATES.currentStream.titleInfo.details.productId))) {
            overrideMkb = true;
        }

        if (getPref(PrefKey.NATIVE_MKB_ENABLED) === 'off') {
            overrideMkb = false;
        }

        if (overrideMkb !== null) {
            overrides.inputConfiguration = Object.assign(overrides.inputConfiguration, {
                enableMouseInput: overrideMkb,
                enableKeyboardInput: overrideMkb,
            });
        }

        // Enable touch controller
        if (isFullVersion() && TouchController.isEnabled()) {
            overrides.inputConfiguration.enableTouchInput = true;
            overrides.inputConfiguration.maxTouchPoints = 10;
        }

        // Enable mic
        if (getPref(PrefKey.AUDIO_MIC_ON_PLAYING)) {
            overrides.audioConfiguration = overrides.audioConfiguration || {};
            overrides.audioConfiguration.enableMicrophone = true;
        }

        obj.clientStreamingConfigOverrides = JSON.stringify(overrides);

        response.json = () => Promise.resolve(obj);
        response.text = () => Promise.resolve(JSON.stringify(obj));

        return response;
    }

    static async handle(request: RequestInfo | URL, init?: RequestInit) {
        let url = (typeof request === 'string') ? request : (request as Request).url;

        // Server list
        if (url.endsWith('/v2/login/user')) {
            return XcloudInterceptor.handleLogin(request, init);
        } else if (url.endsWith('/sessions/cloud/play')) {  // Get session
            return XcloudInterceptor.handlePlay(request, init);
        } else if (url.includes('xboxlive.com') && url.includes('/waittime/')) {
            return XcloudInterceptor.handleWaitTime(request, init);
        } else if (url.endsWith('/configuration')) {
            return XcloudInterceptor.handleConfiguration(request, init);
        } else if (url && url.endsWith('/ice') && url.includes('/sessions/') && (request as Request).method === 'GET') {
            return patchIceCandidates(request as Request);
        }

        return NATIVE_FETCH(request, init);
    }
}
