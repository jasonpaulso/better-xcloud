import { AppInterface, SCRIPT_VERSION, STATES } from "@utils/global";
import { BX_FLAGS } from "@utils/bx-flags";
import { BxLogger } from "@utils/bx-logger";
import { blockSomeNotifications, hashCode, renderString } from "@utils/utils";
import { BxEvent } from "@/utils/bx-event";

import codeControllerCustomization from "./patches/controller-customization.js" with { type: "text" };
import codePollGamepad from "./patches/poll-gamepad.js" with { type: "text" };
import codeExposeStreamSession from "./patches/expose-stream-session.js" with { type: "text" };
import codeGameCardIcons from "./patches/game-card-icons.js" with { type: "text" };
import codeLocalCoOpEnable from "./patches/local-co-op-enable.js" with { type: "text" };
import codeRemotePlayKeepAlive from "./patches/remote-play-keep-alive.js" with { type: "text" };
import codeVibrationAdjust from "./patches/vibration-adjust.js" with { type: "text" };
import codeStreamHud from "./patches/streamhud.js" with { type: "text" };
import { GlobalPref, StorageKey } from "@/enums/pref-keys.js";
import { getGlobalPref } from "@/utils/pref-utils.js";
import { GamePassCloudGallery } from "@/enums/game-pass-gallery";
import { t } from "@/utils/translation";
import { BlockFeature, NativeMkbMode, TouchControllerMode, UiLayout, UiSection } from "@/enums/pref-values";
import { PatcherUtils } from "./patcher-utils.js";

export type PatchName = keyof typeof PATCHES;
export type PatchArray = PatchName[];
export type PatchPage = 'home' | 'stream' | 'product-detail';

const LOG_TAG = 'Patcher';

const PATCHES = {
    // Disable ApplicationInsights.track() function
    disableAiTrack(str: string) {
        let text = '.track=function(';
        const index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        if (PatcherUtils.indexOf(str, '"AppInsightsCore', index, 200) < 0) {
            return false;
        }

        return PatcherUtils.replaceWith(str, index, text, '.track=function(e){},!!function(');
    },

    // Set disableTelemetry() to true
    disableTelemetry(str: string) {
        let text = '.disableTelemetry=function(){return!1}';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, '.disableTelemetry=function(){return!0}');
    },

    disableTelemetryProvider(str: string) {
        let text = 'this.enableLightweightTelemetry=!';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = [
            'this.trackEvent',
            'this.trackPageView',
            'this.trackHttpCompleted',
            'this.trackHttpFailed',
            'this.trackError',
            'this.trackErrorLike',
            'this.onTrackEvent',
            '()=>{}',
        ].join('=');

        return str.replace(text, newCode + ';' + text);
    },

    // Disable IndexDB logging
    disableIndexDbLogging(str: string) {
        let text = ',this.logsDb=new';
        if (!str.includes(text)) {
            return false;
        }

        // Replace log() with an empty function
        let newCode = ',this.log=()=>{}';
        return str.replace(text, newCode + text);
    },

    // Set custom website layout
    websiteLayout(str: string) {
        let text = '?"tv":"default"';
        if (!str.includes(text)) {
            return false;
        }

        const layout = getGlobalPref(GlobalPref.UI_LAYOUT) === UiLayout.TV ? UiLayout.TV : UiLayout.DEFAULT;
        return str.replace(text, `?"${layout}":"${layout}"`);
    },

    // Replace "/direct-connect" with "/play"
    remotePlayDirectConnectUrl(str: string) {
        const index = str.indexOf('/direct-connect');
        if (index < 0) {
            return false;
        }

        return str.replace(str.substring(index - 9, index + 15), 'https://www.xbox.com/play');
    },

    remotePlayKeepAlive(str: string) {
        let text = 'onServerDisconnectMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + codeRemotePlayKeepAlive);

        return str;
    },

    // Enable Remote Play feature
    remotePlayConnectMode(str: string) {
        let text = 'connectMode:"cloud-connect",';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `connectMode: window.BX_REMOTE_PLAY_CONFIG ? "xhome-connect" : "cloud-connect",
remotePlayServerId: (window.BX_REMOTE_PLAY_CONFIG && window.BX_REMOTE_PLAY_CONFIG.serverId) || '',`;
        return str.replace(text, newCode);
    },

    // Remote Play: Disable achievement toast
    remotePlayDisableAchievementToast(str: string) {
        let text = '.AchievementUnlock:{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `if (!!window.BX_REMOTE_PLAY_CONFIG) return;`;
        return str.replace(text, text + newCode);
    },

    // Remote Play: Prevent adding "Fortnite" to the "Jump back in" list
    remotePlayRecentlyUsedTitleIds(str: string) {
        let text = '(e.data.recentlyUsedTitleIds)){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `if (window.BX_REMOTE_PLAY_CONFIG) return;`;
        return str.replace(text, text + newCode);
    },

    // Remote Play: change web page's title
    remotePlayWebTitle(str: string) {
        let text = 'titleTemplate:void 0,title:';
        const index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index + text.length, `!!window.BX_REMOTE_PLAY_CONFIG ? "${t('remote-play')} - Better xCloud" :`);
        return str;
    },

    // Block WebRTC stats collector
    blockWebRtcStatsCollector(str: string) {
        let text = 'this.shouldCollectStats=!0';
        if (!str.includes(text)) {
            return false;
        }

        return str.replace(text, 'this.shouldCollectStats=!1');
    },

    patchPollGamepads(str: string) {
        const index = str.indexOf('},this.pollGamepads=()=>{');
        if (index < 0) {
            return false;
        }

        const setTimeoutIndex = str.indexOf('setTimeout(this.pollGamepads', index);
        if (setTimeoutIndex < 0) {
            return false;
        }

        let codeBlock = str.substring(index, setTimeoutIndex);

        // Patch polling rate
        const tmp = str.substring(setTimeoutIndex, setTimeoutIndex + 150);
        const tmpPatched = tmp.replaceAll('Math.max(0,4-', 'Math.max(0,window.BX_STREAM_SETTINGS.controllerPollingRate - ');
        str = PatcherUtils.replaceWith(str, setTimeoutIndex, tmp, tmpPatched);

        // Block gamepad stats collecting
        if (getGlobalPref(GlobalPref.BLOCK_TRACKING)) {
            codeBlock = codeBlock.replace('this.inputPollingIntervalStats.addValue', '');
            codeBlock = codeBlock.replace('this.inputPollingDurationStats.addValue', '');
        }

        // Controller shortcuts
        let match = codeBlock.match(/this\.gamepadTimestamps\.set\(([A-Za-z0-9_$]+)\.index/);
        if (!match) {
            return false;
        }

        let newCode = renderString(codePollGamepad, {
            gamepadVar: match[1],
        });
        codeBlock = codeBlock.replace('this.gamepadTimestamps.set', newCode + 'this.gamepadTimestamps.set');

        // Controller customization
        match = codeBlock.match(/let ([A-Za-z0-9_$]+)=this\.gamepadMappings\.find/);
        if (!match) {
            return false;
        }

        const xCloudGamepadVar = match[1];
        const inputFeedbackManager = PatcherUtils.indexOf(codeBlock, 'this.inputFeedbackManager.onGamepadConnected(', 0, 10000);
        const backetIndex = PatcherUtils.indexOf(codeBlock, '}', inputFeedbackManager, 100);
        if (backetIndex < 0) {
            return false;
        }

        let customizationCode = ';';  // End previous code line
        customizationCode += renderString(codeControllerCustomization, { xCloudGamepadVar });
        codeBlock = PatcherUtils.insertAt(codeBlock, backetIndex, customizationCode);

        str = str.substring(0, index) + codeBlock + str.substring(setTimeoutIndex);
        return str;
    },

    enableXcloudLogger(str: string) {
        let text = 'this.telemetryProvider=e}log(e,t,r){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
const [logTag, logLevel, logMessage] = Array.from(arguments);
const logFunc = [console.debug, console.log, console.warn, console.error][logLevel];
logFunc(logTag, '//', logMessage);
`;

        str = str.replaceAll(text, text + newCode);
        return str;
    },

    enableConsoleLogging(str: string) {
        let text = 'static isConsoleLoggingAllowed(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replaceAll(text, text + 'return true;');
        return str;
    },

    // Control controller vibration
    playVibration(str: string) {
        let text = '}playVibration(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replaceAll(text, text + codeVibrationAdjust);
        return str;
    },

    disableGamepadDisconnectedScreen(str: string) {
        const index = str.indexOf('"GamepadDisconnected_Title",');
        if (index < 0) {
            return false;
        }

        const constIndex = str.indexOf('const', index - 30);
        str = str.substring(0, constIndex) + 'e.onClose();return null;' + str.substring(constIndex);
        return str;
    },

    patchUpdateInputConfigurationAsync(str: string) {
        let text = 'async updateInputConfigurationAsync(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = 'e.enableTouchInput = true;';

        str = str.replace(text, text + newCode);
        return str;
    },

    // Disable StreamGate
    disableStreamGate(str: string) {
        const index = str.indexOf('case"partially-ready":');
        if (index < 0) {
            return false;
        }

        const bracketIndex = str.indexOf('=>{', index - 150) + 3;

        str = str.substring(0, bracketIndex) + 'return 0;' + str.substring(bracketIndex);
        return str;
    },

    exposeTouchLayoutManager(str: string) {
        let text = 'this._perScopeLayoutsStream=new';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
true;
window.BX_EXPOSED["touchLayoutManager"] = this;
window.dispatchEvent(new Event("${BxEvent.TOUCH_LAYOUT_MANAGER_READY}"));
`;

        str = str.replace(text, newCode + text);
        return str;
    },


    patchBabylonRendererClass(str: string) {
        // ()=>{a.current.render(),h.current=window.requestAnimationFrame(l)
        let index = str.indexOf('.current.render(),');
        if (index < 0) {
            return false;
        }

        // Move back a character
        index -= 1;

        // Get variable of the "BabylonRendererClass" object
        const rendererVar = str[index];

        const newCode = `
if (window.BX_EXPOSED.stopTakRendering) {
    try {
        document.getElementById('BabylonCanvasContainer-main')?.parentElement.classList.add('bx-offscreen');

        ${rendererVar}.current.dispose();
    } catch (e) {}

    window.BX_EXPOSED.stopTakRendering = false;
    return;
}
`;

        str = str.substring(0, index) + newCode + str.substring(index);
        return str;
    },

    supportLocalCoOp(str: string) {
        let text = 'this.gamepadMappingsToSend=[],';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `true; ${codeLocalCoOpEnable}; true,`;

        str = str.replace(text, text + newCode);
        return str;
    },

    forceFortniteConsole(str: string) {
        let text = 'sendTouchInputEnabledMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `window.location.pathname.includes('/launch/fortnite/') && (e = false);`;

        str = str.replace(text, text + newCode);
        return str;
    },

    disableTakRenderer(str: string) {
        let text = 'const{TakRenderer:';
        if (!str.includes(text)) {
            return false;
        }

        let autoOffCode = '';
        if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.OFF) {
            autoOffCode = 'return;';
        } else if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_AUTO_OFF)) {
            autoOffCode = `
const gamepads = window.navigator.getGamepads();
let gamepadFound = false;

for (let gamepad of gamepads) {
    if (gamepad && gamepad.connected) {
        gamepadFound = true;
        break;
    }
}

if (gamepadFound) {
    return;
}
`;
        }

        const newCode = `
${autoOffCode}

const titleInfo = window.BX_EXPOSED.getTitleInfo();
if (titleInfo && !titleInfo.details.hasTouchSupport && !titleInfo.details.hasFakeTouchSupport) {
    return;
}
`;

        str = str.replace(text, newCode + text);
        return str;
    },

    streamCombineSources(str: string) {
        let text = 'this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'this.useCombinedAudioVideoStream=true');
        return str;
    },

    patchStreamHud(str: string) {
        let index = str.indexOf('let{onCollapse');
        if (index < 0) {
            return false;
        }

        let newCode = codeStreamHud;

        // Remove the TAK Edit button when the touch controller is disabled
        if (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.OFF) {
            newCode += 'options.canShowTakHUD = false;';
        }

        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    broadcastPollingMode(str: string) {
        let text = '.setPollingMode=e=>{';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
window.BX_STREAM_SETTINGS.xCloudPollingMode = e.toLowerCase();
BxEvent.dispatch(window, BxEvent.XCLOUD_POLLING_MODE_CHANGED);
`;
        str = str.replace(text, text + newCode);
        return str;
    },

    patchGamepadPolling(str: string) {
        let index = str.indexOf('.shouldHandleGamepadInput)())return void');
        if (index < 0) {
            return false;
        }

        index = str.indexOf('{', index - 20) + 1;
        str = str.substring(0, index) + 'if (window.BX_EXPOSED.disableGamepadPolling) return;' + str.substring(index);
        return str;
    },

    patchXcloudTitleInfo(str: string) {
        let text = 'async cloudConnect';
        let index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        // Find the next "{" backet
        let backetIndex = str.indexOf('{', index);

        // Get param name
        const params = str.substring(index, backetIndex).match(/\(([^)]+)\)/)![1];
        if (!params) {
            return false;
        }

        const titleInfoVar = params.split(',')[0];

        const newCode = `
${titleInfoVar} = window.BX_EXPOSED.modifyTitleInfo(${titleInfoVar});
BxLogger.info('patchXcloudTitleInfo', ${titleInfoVar});
`;
        str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1);
        return str;
    },

    patchRemotePlayMkb(str: string) {
        let text = 'async homeConsoleConnect';
        let index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        // Find the next "{" backet
        let backetIndex = str.indexOf('{', index);

        // Get param name
        const params = str.substring(index, backetIndex).match(/\(([^)]+)\)/)![1];
        if (!params) {
            return false;
        }

        const configsVar = params.split(',')[1];

        const newCode = `
Object.assign(${configsVar}.inputConfiguration, {
    enableMouseInput: false,
    enableKeyboardInput: false,
    enableAbsoluteMouse: false,
});
BxLogger.info('patchRemotePlayMkb', ${configsVar});
`;

        str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1);
        return str;

    },

    patchAudioMediaStream(str: string) {
        let text = '.srcObject=this.audioMediaStream,';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `window.BX_EXPOSED.setupGainNode(arguments[1], this.audioMediaStream),`;

        str = str.replace(text, text + newCode);
        return str;
    },

    patchCombinedAudioVideoMediaStream(str: string) {
        let text = '.srcObject=this.combinedAudioVideoStream';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `,window.BX_EXPOSED.setupGainNode(arguments[0], this.combinedAudioVideoStream)`;
        str = str.replace(text, text + newCode);
        return str;
    },

    patchTouchControlDefaultOpacity(str: string) {
        let text = 'opacityMultiplier:1';
        if (!str.includes(text)) {
            return false;
        }

        const opacity = (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_DEFAULT_OPACITY) / 100).toFixed(1);
        const newCode = `opacityMultiplier: ${opacity}`;
        str = str.replace(text, newCode);
        return str;
    },

    patchShowSensorControls(str: string) {
        let text = ',{shouldShowSensorControls:';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `,{shouldShowSensorControls: (window.BX_EXPOSED && window.BX_EXPOSED.shouldShowSensorControls) ||`;

        str = str.replace(text, newCode);
        return str;
    },

    /*
    exposeEventTarget(str: string) {
        let text ='this._eventTarget=new EventTarget';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
window.BX_EXPOSED.eventTarget = ${text},
window.dispatchEvent(new Event('${BxEvent.STREAM_EVENT_TARGET_READY}'))
`;

        str = str.replace(text, newCode);
        return str;
    },
    //*/

    // Class with: connectAsync(), doConnectAsync(), setPlayClient()
    exposeStreamSession(str: string) {
        let text =',this._connectionType=';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `;
${codeExposeStreamSession}
true` + text;

        str = str.replace(text, newCode);
        return str;
    },

    skipFeedbackDialog(str: string) {
        let text = 'shouldTransitionToFeedback(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return !1;');
        return str;
    },

    enableNativeMkb(str: string) {
        // l = t.mouseSupported && t.keyboardSupported && t.fullscreenSupported;
        let index = str.indexOf('.mouseSupported&&');
        if (index < 0) {
            return false;
        }

        // Get the variable name "t"
        const varName = str.charAt(index - 1);
        // Find the full text
        let text = `${varName}.mouseSupported&&${varName}.keyboardSupported&&${varName}.fullscreenSupported;`;
        if ((!str.includes(text))) {
            return false;
        }

        str = str.replace(text, text + 'return true;');
        return str;
    },

    patchMouseAndKeyboardEnabled(str: string) {
        let text = 'get mouseAndKeyboardEnabled(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return true;');
        return str;
    },

    exposeInputChannel(str: string) {
        let index = str.indexOf('this.flushData=');
        if (index < 0) {
            return false;
        }

        const newCode = 'window.BX_EXPOSED.inputChannel = this,';
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    disableNativeRequestPointerLock(str: string) {
        let text = 'async requestPointerLock(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return;');
        return str;
    },

    // Fix crashing when RequestInfo.origin is empty
    patchRequestInfoCrash(str: string) {
        let text = 'if(!e)throw new Error("RequestInfo.origin is falsy");';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'if (!e) e = "https://www.xbox.com";');
        return str;
    },

    exposeDialogRoutes(str: string) {
        let text = 'return{goBack:function(){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'return window.BX_EXPOSED.dialogRoutes = {goBack:function(){');
        return str;
    },

    enableTvRoutes(str: string) {
        let index = str.indexOf('.LoginDeviceCode.path,');
        if (index < 0) {
            return false;
        }

        // Find *qe* name
        const match = /render:.*?jsx\)\(([^,]+),/.exec(str.substring(index, index + 100));
        if (!match) {
            return false;
        }

        const funcName = match[1];

        // Replace *qe*'s return value
        // `return a && r ?` => `return a && r || true ?`
        index = str.indexOf(`const ${funcName}=e=>{`);
        index > -1 && (index = str.indexOf('return ', index));
        index > -1 && (index = str.indexOf('?', index));

        if (index < 0) {
            return false;
        }

        str = str.substring(0, index) + '|| true' + str.substring(index);
        return str;
    },

    // Don't render News section
    ignoreNewsSection(str: string) {
        let index = str.indexOf('Logger("CarouselRow")');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'const ', index, 200));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'return null;');
        return str;
    },

    // Don't render "Play With Friends" sections
    ignorePlayWithFriendsSection(str: string) {
        let index = str.indexOf('location:"PlayWithFriendsRow",');
        if (index < 0) {
            return false;
        }

        index = PatcherUtils.lastIndexOf(str, 'return', index, 50);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, 'return', 'return null;');
        return str;
    },

    // Don't render "All Games" sections
    ignoreAllGamesSection(str: string) {
        let index = str.indexOf('className:"AllGamesRow-module__allGamesRowContainer');
        index > -1 && (index = PatcherUtils.indexOf(str, 'grid:!0,', index, 1500));
        index > -1 && (index = PatcherUtils.lastIndexOf(str, '(0,', index, 70));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'true ? null :');
        return str;
    },

    ignoreByogSection(str: string) {
        let index = str.indexOf('"ByogRow-module__container');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 100));

        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'return null;');
        return str;
    },

    // home-page.js
    ignorePlayWithTouchSection(str: string) {
        let index = str.indexOf('("Play_With_Touch"),');
        if (index < 0) {
            return false;
        }

        index = PatcherUtils.lastIndexOf(str, 'const ', index, 30);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'return null;');
        return str;
    },

    // home-page.js
    ignoreSiglSections(str: string) {
        let index = str.indexOf('SiglRow-module__heroCard___');
        if (index < 0) {
            return false;
        }

        index = PatcherUtils.lastIndexOf(str, 'const[', index, 300);
        if (index < 0) {
            return false;
        }

        const PREF_HIDE_SECTIONS = getGlobalPref(GlobalPref.UI_HIDE_SECTIONS);
        const siglIds: GamePassCloudGallery[] = [];

        const sections: PartialRecord<UiSection, GamePassCloudGallery> = {
            [UiSection.NATIVE_MKB]: GamePassCloudGallery.NATIVE_MKB,
            [UiSection.MOST_POPULAR]: GamePassCloudGallery.MOST_POPULAR,
            [UiSection.LEAVING_SOON]: GamePassCloudGallery.LEAVING_SOON,
            [UiSection.RECENTLY_ADDED]: GamePassCloudGallery.RECENTLY_ADDED,
        };

        for (const section of PREF_HIDE_SECTIONS) {
            const galleryId = sections[section];
            galleryId && siglIds.push(galleryId);
        };

        const checkSyntax = siglIds.map(item => `siglId === "${item}"`).join(' || ');

        const newCode = `
if (e && e.id) {
    const siglId = e.id;
    if (${checkSyntax}) {
        return null;
    }
}
`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    ignoreGenresSection(str: string) {
        let index = str.indexOf('="GenresRow"');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, '{', index));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index + 1, 'return null;');
        return str;
    },

    // Override Storage.getSettings()
    overrideStorageGetSettings(str: string) {
        let text = '}getSetting(e){';
        if (!str.includes(text)) {
            return false;
        }

        const newCode = `
// console.log('setting', this.baseStorageKey, e);
if (this.baseStorageKey in window.BX_EXPOSED.overrideSettings) {
    const settings = window.BX_EXPOSED.overrideSettings[this.baseStorageKey];
    if (e in settings) {
        return settings[e];
    }
}
`;
        str = str.replace(text, text + newCode);
        return str;
    },

    // game-stream.js   24.16.4
    alwaysShowStreamHud(str: string) {
        let index = str.indexOf(',{onShowStreamMenu:');
        if (index < 0) {
            return false;
        }

        index = str.indexOf('&&(0,', index - 100);
        if (index < 0) {
            return false;
        }

        const commaIndex = str.indexOf(',', index - 10);
        str = str.substring(0, commaIndex) + ',true' + str.substring(index);
        return str;
    },

    // 49851.js#4083, 27.0.4
    patchSetCurrentFocus(str: string) {
        let index = str.indexOf('.setCurrentFocus=(');
        if (index < 0) {
            return false;
        }

        index = str.indexOf('{', index) + 1;
        str = PatcherUtils.insertAt(str, index, 'e && BxEvent.dispatch(window, BxEvent.NAVIGATION_FOCUS_CHANGED, { element: e });');
        return str;
    },

    detectProductDetailPage(str: string) {
        let index = str.indexOf('{location:"ProductDetailPage",');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 200));

        if (index < 0) {
            return false;
        }

        str = str.substring(0, index) + 'BxEvent.dispatch(window, BxEvent.XCLOUD_RENDERING_COMPONENT, { component: "product-detail" });' + str.substring(index);
        return str;
    },

    detectBrowserRouterReady(str: string) {
        let index = str.indexOf('{history:this.history,');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 100));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, 'window.BxEvent.dispatch(window, window.BxEvent.XCLOUD_ROUTER_HISTORY_READY, {history: this.history});');
        return str;
    },

    // Set Achievements list's filter default to "Locked"
    guideAchievementsDefaultLocked(str: string) {
        let index = str.indexOf('FilterButton-module__container');
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, '"All"', index, 150));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, '"All"', '"Locked"');

        index = str.indexOf('"Guide_Achievements_Unlocked_Empty","Guide_Achievements_Locked_Empty"');
        index >= 0 && (index = PatcherUtils.indexOf(str, '"All"', index, 250));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, '"All"', '"Locked"');
        return str;
    },

    // Disable long touch activating context menu
    disableTouchContextMenu(str: string) {
        let index = str.indexOf('"ContextualCardActions-module__container');
        index >= 0 && (index = str.indexOf('addEventListener("touchstart"', index));
        index >= 0 && (index = PatcherUtils.lastIndexOf(str, 'return ', index, 50));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.replaceWith(str, index, 'return', 'return () => {};');
        return str;
    },

    // Optimize Game slug generator by using cached RegEx
    optimizeGameSlugGenerator(str: string) {
        let text = '/[;,/?:@&=+_`~$%#^*()!^\\u2122\\xae\\xa9]/g';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, 'window.BX_EXPOSED.GameSlugRegexes[0]');
        str = str.replace('/ {2,}/g', 'window.BX_EXPOSED.GameSlugRegexes[1]');
        str = str.replace('/ /g', 'window.BX_EXPOSED.GameSlugRegexes[2]');

        return str;
    },

    modifyPreloadedState(str: string) {
        let text = '=window.__PRELOADED_STATE__;';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, '=window.BX_EXPOSED.modifyPreloadedState(window.__PRELOADED_STATE__);');
        return str;
    },

    homePageBeforeLoad(str: string) {
        return PatcherUtils.patchBeforePageLoad(str, 'home');
    },

    productDetailPageBeforeLoad(str: string) {
        return PatcherUtils.patchBeforePageLoad(str, 'product-detail');
    },

    streamPageBeforeLoad(str: string) {
        return PatcherUtils.patchBeforePageLoad(str, 'stream');
    },

    disableAbsoluteMouse(str: string) {
        let text = 'sendAbsoluteMouseCapableMessage(e){';
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace(text, text + 'return;');
        return str;
    },

    changeNotificationsSubscription(str: string) {
        let text = ';buildSubscriptionQueryParamsForNotifications(';
        let index = str.indexOf(text);
        if (index < 0) {
            return false;
        }

        index += text.length;
        // Get parameter name
        const subsVar = str[index];

        // Find index after {
        index = str.indexOf('{', index) + 1;
        const blockFeatures = getGlobalPref(GlobalPref.BLOCK_FEATURES);
        const filters = [];
        if (blockFeatures.includes(BlockFeature.NOTIFICATIONS_INVITES)) {
            filters.push('GameInvite', 'PartyInvite');
        }

        if (blockFeatures.includes(BlockFeature.FRIENDS)) {
            filters.push('Follower');
        }

        if (blockFeatures.includes(BlockFeature.NOTIFICATIONS_ACHIEVEMENTS)) {
            filters.push('AchievementUnlock');
        }

        const newCode = `
let subs = ${subsVar};
subs = subs.filter(val => !${JSON.stringify(filters)}.includes(val));
${subsVar} = subs;
`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    exposeReactCreateComponent(str: string) {
        let index = str.indexOf('.prototype.isReactComponent={}');

        index > -1 && (index = PatcherUtils.indexOf(str, '.createElement=', index));
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index - 1, 'window.BX_EXPOSED.reactCreateElement=');

        index = PatcherUtils.indexOf(str, '.useEffect=', index);
        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index - 1, 'window.BX_EXPOSED.reactUseEffect=');
        return str;
    },

    // 27.0.6-hotfix.1, 73704.js
    gameCardCustomIcons(str: string) {
        let initialIndex = str.indexOf('const{supportedInputIcons:');
        if (initialIndex < 0) {
            return false;
        }

        const returnIndex = PatcherUtils.lastIndexOf(str, 'return ', str.indexOf('SupportedInputsBadge'));
        if (returnIndex < 0) {
            return false;
        }

        // Find function's parameter
        const arrowIndex = PatcherUtils.lastIndexOf(str, '=>{', initialIndex, 300);
        if (arrowIndex < 0) {
            return false;
        }

        const paramVar = PatcherUtils.getVariableNameBefore(str, arrowIndex);

        // Find supportedInputIcons and title var names
        const supportedInputIconsVar = PatcherUtils.getVariableNameAfter(str, PatcherUtils.indexOf(str, 'supportedInputIcons:', initialIndex, 100, true));

        if (!paramVar || !supportedInputIconsVar) {
            return false;
        }

        const newCode = renderString(codeGameCardIcons, {
            param: paramVar,
            supportedInputIcons: supportedInputIconsVar,
        });

        str = PatcherUtils.insertAt(str, returnIndex, newCode);
        return str;
    },

    /*
    // 27.0.6-hotfix.1, 28444.js
    gameCardPassTitle(str: string) {
        // Pass gameTitle info to gameCardCustomIcons()
        let index = str.indexOf('=["productId","showInputBadges","ownershipBadgeType"');
        index > -1 && (index = PatcherUtils.indexOf(str, ',gameTitle:', index, 500, true));
        if (index < 0) {
            return false;
        }

        const gameTitleVar = PatcherUtils.getVariableNameAfter(str, index);
        if (!gameTitleVar) {
            return false;
        }

        index = PatcherUtils.indexOf(str, 'return', index);
        index = PatcherUtils.indexOf(str, 'productId:', index);
        if (index < 0) {
            return false;
        }

        const newCode = `gameTitle: ${gameTitleVar},`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },
    */

    // 27.0.6-hotfix.1, 78831.js
    setImageQuality(str: string) {
        let index = str.indexOf('const{size:{width:');
        index > -1 && (index = PatcherUtils.indexOf(str, '=new URLSearchParams', index, 500));
        if (index < 0) {
            return false;
        }

        const paramVar = PatcherUtils.getVariableNameBefore(str, index);
        if (!paramVar) {
            return false;
        }

        // Find "return" keyword
        index = PatcherUtils.indexOf(str, 'return', index, 200);

        const newCode = `${paramVar}.set('q', ${getGlobalPref(GlobalPref.UI_IMAGE_QUALITY)});`;
        str = PatcherUtils.insertAt(str, index, newCode);

        return str;
    },

    setBackgroundImageQuality(str: string) {
        let index = str.indexOf('}?w=${');
        index > -1 && (index = PatcherUtils.indexOf(str, '}', index + 1, 10, true));

        if (index < 0) {
            return false;
        }

        str = PatcherUtils.insertAt(str, index, `&q=${getGlobalPref(GlobalPref.UI_IMAGE_QUALITY)}`);
        return str;
    },

    injectHeaderUseEffect(str: string) {
        let index = str.indexOf('"EdgewaterHeader-module__spaceBetween');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 300));
        if (index < 0) {
            return false;
        }

        const newCode = `window.BX_EXPOSED.reactUseEffect(() => window.BxEventBus.Script.emit('header.rendered', {}));`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },

    injectErrorPageUseEffect(str: string) {
        let index = str.indexOf('"PureErrorPage-module__container');
        index > -1 && (index = PatcherUtils.lastIndexOf(str, 'return', index, 200));
        if (index < 0) {
            return false;
        }

        const newCode = `window.BX_EXPOSED.reactUseEffect(() => window.BxEventBus.Script.emit('error.rendered', {}));`;
        str = PatcherUtils.insertAt(str, index, newCode);
        return str;
    },
};

let PATCH_ORDERS = PatcherUtils.filterPatches([
    ...(AppInterface && getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON ? [
        'enableNativeMkb',
        'disableAbsoluteMouse',
    ] : []),

    'exposeReactCreateComponent',

    'injectHeaderUseEffect',
    'injectErrorPageUseEffect',

    'gameCardCustomIcons',
    // 'gameCardPassTitle',

    ...(getGlobalPref(GlobalPref.UI_IMAGE_QUALITY) < 90 ? [
        'setImageQuality',
    ] : []),

    'modifyPreloadedState',

    'optimizeGameSlugGenerator',

    'detectBrowserRouterReady',
    'patchRequestInfoCrash',

    'disableStreamGate',
    'broadcastPollingMode',
    'patchGamepadPolling',

    'exposeStreamSession',
    'exposeDialogRoutes',

    'homePageBeforeLoad',
    'productDetailPageBeforeLoad',
    'streamPageBeforeLoad',

    'guideAchievementsDefaultLocked',

    'enableTvRoutes',

    'supportLocalCoOp',
    'overrideStorageGetSettings',
    getGlobalPref(GlobalPref.UI_GAME_CARD_SHOW_WAIT_TIME) && 'patchSetCurrentFocus',

    getGlobalPref(GlobalPref.UI_LAYOUT) !== UiLayout.DEFAULT && 'websiteLayout',
    getGlobalPref(GlobalPref.GAME_FORTNITE_FORCE_CONSOLE) && 'forceFortniteConsole',

    ...(STATES.userAgent.capabilities.touch ? [
        'disableTouchContextMenu',
    ] : []),

    ...(getGlobalPref(GlobalPref.BLOCK_TRACKING) ? [
        'disableAiTrack',
        'disableTelemetry',

        'blockWebRtcStatsCollector',
        'disableIndexDbLogging',

        'disableTelemetryProvider',
    ] : []),

    ...(getGlobalPref(GlobalPref.REMOTE_PLAY_ENABLED) ? [
        'remotePlayKeepAlive',
        'remotePlayDirectConnectUrl',
        'remotePlayDisableAchievementToast',
        'remotePlayRecentlyUsedTitleIds',
        'remotePlayWebTitle',
        STATES.userAgent.capabilities.touch && 'patchUpdateInputConfigurationAsync',
    ] : []),

    ...(BX_FLAGS.EnableXcloudLogging ? [
        'enableConsoleLogging',
        'enableXcloudLogger',
    ] : []),
]);

const hideSections = getGlobalPref(GlobalPref.UI_HIDE_SECTIONS);
let HOME_PAGE_PATCH_ORDERS = PatcherUtils.filterPatches([
    hideSections.includes(UiSection.NEWS) && 'ignoreNewsSection',
    (getGlobalPref(GlobalPref.BLOCK_FEATURES).includes(BlockFeature.FRIENDS) || hideSections.includes(UiSection.FRIENDS)) && 'ignorePlayWithFriendsSection',
    hideSections.includes(UiSection.ALL_GAMES) && 'ignoreAllGamesSection',
    hideSections.includes(UiSection.GENRES) && 'ignoreGenresSection',
    !getGlobalPref(GlobalPref.BLOCK_FEATURES).includes(BlockFeature.BYOG) && hideSections.includes(UiSection.BOYG) && 'ignoreByogSection',

    STATES.browser.capabilities.touch && hideSections.includes(UiSection.TOUCH) && 'ignorePlayWithTouchSection',
    hideSections.some(value => [UiSection.NATIVE_MKB, UiSection.MOST_POPULAR].includes(value)) && 'ignoreSiglSections',

    ...(getGlobalPref(GlobalPref.UI_IMAGE_QUALITY) < 90 ? [
        'setBackgroundImageQuality',
    ] : []),

    ...(blockSomeNotifications() ? [
        'changeNotificationsSubscription',
    ] : []),
]);

// Only when playing
let STREAM_PAGE_PATCH_ORDERS = PatcherUtils.filterPatches([
    'exposeInputChannel',

    'patchXcloudTitleInfo',
    'disableGamepadDisconnectedScreen',
    'patchStreamHud',
    'playVibration',

    'alwaysShowStreamHud',

    // 'exposeEventTarget',

    // Patch volume control for normal stream
    getGlobalPref(GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED) && !getGlobalPref(GlobalPref.STREAM_COMBINE_SOURCES) && 'patchAudioMediaStream',
    // Patch volume control for combined audio+video stream
    getGlobalPref(GlobalPref.AUDIO_VOLUME_CONTROL_ENABLED) && getGlobalPref(GlobalPref.STREAM_COMBINE_SOURCES) && 'patchCombinedAudioVideoMediaStream',

    // Skip feedback dialog
    getGlobalPref(GlobalPref.UI_DISABLE_FEEDBACK_DIALOG) && 'skipFeedbackDialog',

    ...(STATES.userAgent.capabilities.touch ? [
        getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.ALL && 'patchShowSensorControls',
        getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.ALL && 'exposeTouchLayoutManager',
        (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) === TouchControllerMode.OFF || getGlobalPref(GlobalPref.TOUCH_CONTROLLER_AUTO_OFF)) && 'disableTakRenderer',
        getGlobalPref(GlobalPref.TOUCH_CONTROLLER_DEFAULT_OPACITY) !== 100 && 'patchTouchControlDefaultOpacity',
        (getGlobalPref(GlobalPref.TOUCH_CONTROLLER_MODE) !== TouchControllerMode.OFF && (getGlobalPref(GlobalPref.MKB_ENABLED) || getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON)) && 'patchBabylonRendererClass',
    ] : []),

    BX_FLAGS.EnableXcloudLogging && 'enableConsoleLogging',

    'patchPollGamepads',

    getGlobalPref(GlobalPref.STREAM_COMBINE_SOURCES) && 'streamCombineSources',

    ...(getGlobalPref(GlobalPref.REMOTE_PLAY_ENABLED) ? [
        'patchRemotePlayMkb',
        'remotePlayConnectMode',
    ] : []),

    // Native MKB
    ...(AppInterface && getGlobalPref(GlobalPref.NATIVE_MKB_MODE) === NativeMkbMode.ON ? [
        'patchMouseAndKeyboardEnabled',
        'disableNativeRequestPointerLock',
    ] : []),
]);

let PRODUCT_DETAIL_PAGE_PATCH_ORDERS = PatcherUtils.filterPatches([
    'detectProductDetailPage',
]);

const ALL_PATCHES = [...PATCH_ORDERS, ...HOME_PAGE_PATCH_ORDERS, ...STREAM_PAGE_PATCH_ORDERS, ...PRODUCT_DETAIL_PAGE_PATCH_ORDERS];

export class Patcher {
    private static remainingPatches: { [key in PatchPage]: PatchArray } = {
        home: HOME_PAGE_PATCH_ORDERS,
        stream: STREAM_PAGE_PATCH_ORDERS,
        'product-detail': PRODUCT_DETAIL_PAGE_PATCH_ORDERS,
    };

    static patchPage(page: PatchPage) {
        const remaining = Patcher.remainingPatches[page];
        if (!remaining) {
            return;
        }

        PATCH_ORDERS = PATCH_ORDERS.concat(remaining);
        delete Patcher.remainingPatches[page];
    }

    private static patchNativeBind() {
        const nativeBind = Function.prototype.bind;
        Function.prototype.bind = function() {
            let valid = false;

            // Looking for these criteria:
            // - Variable name <= 2 characters
            // - Has 2 params:
            //     - The first one is null
            //     - The second one is either 0 or a function
            if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
                if (arguments[1] === 0 || (typeof arguments[1] === 'function')) {
                    valid = true;
                }
            }

            if (!valid) {
                // @ts-ignore
                return nativeBind.apply(this, arguments);
            }

            if (typeof arguments[1] === 'function') {
                BxLogger.info(LOG_TAG, 'Restored Function.prototype.bind()');
                Function.prototype.bind = nativeBind;
            }

            const orgFunc = this;
            const newFunc = (a: any, item: any) => {
                Patcher.checkChunks(item);
                orgFunc(a, item);
            }

            // @ts-ignore
            return nativeBind.apply(newFunc, arguments);
        };
    }

    static checkChunks(item: [[number], { [key: string]: () => {} }]) {
        // !!! Use "caches" as variable name will break touch controller???
        // console.log('patch', '-----');
        let patchesToCheck: PatchArray;
        let appliedPatches: PatchArray;

        const chunkData = item[1];
        const patchesMap: Record<string, PatchArray> = {};
        const patcherCache = PatcherCache.getInstance();

        for (const chunkId in chunkData) {
            appliedPatches = [];

            const cachedPatches = patcherCache.getPatches(chunkId);
            if (cachedPatches) {
                // clone cachedPatches
                patchesToCheck = cachedPatches.slice(0);
                patchesToCheck.push(...PATCH_ORDERS);
            } else {
                patchesToCheck = PATCH_ORDERS.slice(0);
            }

            // Empty patch list
            if (!patchesToCheck.length) {
                continue;
            }

            const func = chunkData[chunkId];
            const funcStr = func.toString();
            let patchedFuncStr = funcStr;

            let modified = false;
            const chunkAppliedPatches = [];

            for (let patchIndex = 0; patchIndex < patchesToCheck.length; patchIndex++) {
                const patchName = patchesToCheck[patchIndex];
                if (appliedPatches.indexOf(patchName) > -1) {
                    continue;
                }

                if (!PATCHES[patchName]) {
                    continue;
                }

                // Check function against patch
                const tmpStr = PATCHES[patchName].call(null, patchedFuncStr);

                // Not patched
                if (!tmpStr) {
                    continue;
                }

                modified = true;
                patchedFuncStr = tmpStr;

                appliedPatches.push(patchName);
                chunkAppliedPatches.push(patchName);

                // Remove patch
                patchesToCheck.splice(patchIndex, 1);
                patchIndex--;
                PATCH_ORDERS = PATCH_ORDERS.filter(item => item != patchName);
            }

            // Apply patched functions
            if (modified) {
                BxLogger.info(LOG_TAG, `✅ [${chunkId}] ${chunkAppliedPatches.join(', ')}`);
                PATCH_ORDERS.length && BxLogger.info(LOG_TAG, 'Remaining patches', PATCH_ORDERS);

                BX_FLAGS.Debug && console.time(LOG_TAG);
                try {
                    chunkData[chunkId] = eval(patchedFuncStr);
                } catch (e: unknown) {
                    if (e instanceof Error) {
                        BxLogger.error(LOG_TAG, 'Error', appliedPatches, e.message, patchedFuncStr);
                    }
                }
                BX_FLAGS.Debug && console.timeEnd(LOG_TAG);
            }

            // Save to cache
            if (appliedPatches.length) {
                patchesMap[chunkId] = appliedPatches;
            }
        }

        if (Object.keys(patchesMap).length) {
            patcherCache.saveToCache(patchesMap);
        }
    }

    static init() {
        Patcher.patchNativeBind();
    }
}

export class PatcherCache {
    private static instance: PatcherCache;
    public static getInstance = () => PatcherCache.instance ?? (PatcherCache.instance = new PatcherCache());

    private readonly KEY_CACHE = StorageKey.PATCHES_CACHE;
    private readonly KEY_SIGNATURE = StorageKey.PATCHES_SIGNATURE;

    private CACHE!: { [key: string]: PatchArray };

    private constructor() {
        this.checkSignature();

        // Read cache from storage
        this.CACHE = JSON.parse(window.localStorage.getItem(this.KEY_CACHE) || '{}');
        BxLogger.info(LOG_TAG, 'Cache', this.CACHE);

        const pathName = window.location.pathname;
        if (pathName.includes('/play/launch/')) {
            Patcher.patchPage('stream');
        } else if (pathName.includes('/play/games/')) {
            Patcher.patchPage('product-detail');
        } else if (pathName.endsWith('/play') || pathName.endsWith('/play/')) {
            Patcher.patchPage('home');
        }

        // Remove cached patches from PATCH_ORDERS & PLAYING_PATCH_ORDERS
        PATCH_ORDERS = this.cleanupPatches(PATCH_ORDERS);
        STREAM_PAGE_PATCH_ORDERS = this.cleanupPatches(STREAM_PAGE_PATCH_ORDERS);
        PRODUCT_DETAIL_PAGE_PATCH_ORDERS = this.cleanupPatches(PRODUCT_DETAIL_PAGE_PATCH_ORDERS);

        BxLogger.info(LOG_TAG, 'PATCH_ORDERS', PATCH_ORDERS.slice(0));
    }

    /**
     * Get patch's signature
     */
    private getSignature(): number {
        const scriptVersion = SCRIPT_VERSION;
        const patches = JSON.stringify(ALL_PATCHES);

        // Get client.js's hash
        let webVersion = '';
        const $link = document.querySelector<HTMLLinkElement>('link[data-chunk="client"][href*="/client."]');
        if ($link) {
            const match = /\/client\.([^\.]+)\.js/.exec($link.href);
            match && (webVersion = match[1]);
        } else {
            // Get version from <meta>
            // Sometimes this value is missing
            webVersion = (document.querySelector<HTMLMetaElement>('meta[name=gamepass-app-version]'))?.content ?? '';
        }

        // Calculate signature
        const sig = hashCode(scriptVersion + webVersion + patches)
        return sig;
    }

    clear() {
        // Clear cache
        window.localStorage.removeItem(this.KEY_CACHE);
        this.CACHE = {};
    }

    private checkSignature() {
        const storedSig = window.localStorage.getItem(this.KEY_SIGNATURE) || 0;
        const currentSig = this.getSignature();

        if (currentSig !== parseInt(storedSig as string)) {
            // Save new signature
            BxLogger.warning(LOG_TAG, 'Signature changed');
            window.localStorage.setItem(this.KEY_SIGNATURE, currentSig.toString());

            this.clear();
        } else {
            BxLogger.info(LOG_TAG, 'Signature unchanged');
        }
    }

    private cleanupPatches(patches: PatchArray): PatchArray {
        return patches.filter(item => {
            for (const id in this.CACHE) {
                const cached = this.CACHE[id];

                if (cached.includes(item)) {
                    return false;
                }
            }

            return true;
        });
    }

    getPatches(id: string): PatchArray {
        return this.CACHE[id];
    }

    saveToCache(subCache: Record<string, PatchArray>) {
        for (const id in subCache) {
            const patchNames = subCache[id];

            let data = this.CACHE[id];
            if (!data) {
                this.CACHE[id] = patchNames;
            } else {
                for (const patchName of patchNames) {
                    if (!data.includes(patchName)) {
                        data.push(patchName);
                    }
                }
            }
        }

        // Save to storage
        window.localStorage.setItem(this.KEY_CACHE, JSON.stringify(this.CACHE));
    }
}
