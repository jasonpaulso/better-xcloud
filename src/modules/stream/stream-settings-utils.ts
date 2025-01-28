import { STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { StreamPref } from "@/enums/pref-keys";
import { StreamVideoProcessing, StreamPlayerType } from "@/enums/pref-values";
import { getStreamPref, setStreamPref } from "@/utils/pref-utils";
import { SettingsManager } from "../settings-manager";

export function onChangeVideoPlayerType() {
    const playerType = getStreamPref(StreamPref.VIDEO_PLAYER_TYPE);
    const settingsManager = SettingsManager.getInstance();
    if (!settingsManager.hasElement(StreamPref.VIDEO_PROCESSING)) {
        return;
    }

    let isDisabled = false;

    const $videoProcessing = settingsManager.getElement(StreamPref.VIDEO_PROCESSING) as HTMLSelectElement;
    const $videoSharpness = settingsManager.getElement(StreamPref.VIDEO_SHARPNESS);
    const $videoPowerPreference = settingsManager.getElement(StreamPref.VIDEO_POWER_PREFERENCE);
    const $videoMaxFps = settingsManager.getElement(StreamPref.VIDEO_MAX_FPS);

    const $optCas = $videoProcessing.querySelector<HTMLOptionElement>(`option[value=${StreamVideoProcessing.CAS}]`);

    if (playerType === StreamPlayerType.WEBGL2) {
        $optCas && ($optCas.disabled = false);
    } else {
        // Only allow USM when player type is Video
        $videoProcessing.value = StreamVideoProcessing.USM;
        setStreamPref(StreamPref.VIDEO_PROCESSING, StreamVideoProcessing.USM, 'direct');

        $optCas && ($optCas.disabled = true);

        if (UserAgent.isSafari()) {
            isDisabled = true;
        }
    }

    $videoProcessing.disabled = isDisabled;
    $videoSharpness.dataset.disabled = isDisabled.toString();

    // Hide Power Preference setting if renderer isn't WebGL2
    $videoPowerPreference.closest('.bx-settings-row')!.classList.toggle('bx-gone', playerType !== StreamPlayerType.WEBGL2);
    $videoMaxFps.closest('.bx-settings-row')!.classList.toggle('bx-gone', playerType !== StreamPlayerType.WEBGL2);
}


export function limitVideoPlayerFps(targetFps: number) {
    const streamPlayer = STATES.currentStream.streamPlayer;
    streamPlayer?.getWebGL2Player()?.setTargetFps(targetFps);
}


export function updateVideoPlayer() {
    const streamPlayer = STATES.currentStream.streamPlayer;
    if (!streamPlayer) {
        return;
    }

    limitVideoPlayerFps(getStreamPref(StreamPref.VIDEO_MAX_FPS));

    const options = {
        processing: getStreamPref(StreamPref.VIDEO_PROCESSING),
        sharpness: getStreamPref(StreamPref.VIDEO_SHARPNESS),
        saturation: getStreamPref(StreamPref.VIDEO_SATURATION),
        contrast: getStreamPref(StreamPref.VIDEO_CONTRAST),
        brightness: getStreamPref(StreamPref.VIDEO_BRIGHTNESS),
    } satisfies StreamPlayerOptions;

    streamPlayer.setPlayerType(getStreamPref(StreamPref.VIDEO_PLAYER_TYPE));
    streamPlayer.updateOptions(options);
    streamPlayer.refreshPlayer();
}

window.addEventListener('resize', updateVideoPlayer);
