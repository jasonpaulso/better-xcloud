import { PrefKey } from "@/enums/pref-keys";
import { BX_FLAGS } from "./bx-flags";
import { getPref } from "./settings-storages/global-settings-storage";
import { NativeMkbMode } from "@/enums/pref-values";

export let FeatureGates: {[key: string]: boolean} = {
    PwaPrompt: false,
    EnableWifiWarnings: false,
    EnableUpdateRequiredPage: false,
    ShowForcedUpdateScreen: false,
};

// Enable Native Mouse & Keyboard
const nativeMkbMode = getPref<NativeMkbMode>(PrefKey.NATIVE_MKB_MODE);
if (nativeMkbMode !== NativeMkbMode.DEFAULT) {
    FeatureGates.EnableMouseAndKeyboard = nativeMkbMode === NativeMkbMode.ON;
}

// Disable chat feature
if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
    FeatureGates.EnableGuideChatTab = false;
}

// Disable BYOG feature
if (getPref(PrefKey.BYOG_DISABLED)) {
    FeatureGates.EnableBYOG = false;
    FeatureGates.EnableBYOGPurchase = false;
}

if (BX_FLAGS.FeatureGates) {
    FeatureGates = Object.assign(BX_FLAGS.FeatureGates, FeatureGates);
}
