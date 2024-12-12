import { PrefKey } from "@/enums/pref-keys";
import { BX_FLAGS } from "./bx-flags";
import { getPref } from "./settings-storages/global-settings-storage";
import { BlockFeature, NativeMkbMode } from "@/enums/pref-values";

export let FeatureGates: { [key: string]: boolean } = {
    PwaPrompt: false,
    EnableWifiWarnings: false,
    EnableUpdateRequiredPage: false,
    ShowForcedUpdateScreen: false,
    EnableTakControlResizing: true,  // Experimenting
};

// Enable Native Mouse & Keyboard
const nativeMkbMode = getPref<NativeMkbMode>(PrefKey.NATIVE_MKB_MODE);
if (nativeMkbMode !== NativeMkbMode.DEFAULT) {
    FeatureGates.EnableMouseAndKeyboard = nativeMkbMode === NativeMkbMode.ON;
}

// Disable chat feature
const blockFeatures = getPref<BlockFeature[]>(PrefKey.BLOCK_FEATURES);
if (blockFeatures.includes(BlockFeature.CHAT)) {
    FeatureGates.EnableGuideChatTab = false;
}

if (blockFeatures.includes(BlockFeature.FRIENDS)) {
    FeatureGates.EnableFriendsAndFollowers = false;
}

// Disable BYOG feature
if (blockFeatures.includes(BlockFeature.BYOG)) {
    FeatureGates.EnableBYOG = false;
    FeatureGates.EnableBYOGPurchase = false;
}

if (BX_FLAGS.FeatureGates) {
    FeatureGates = Object.assign(BX_FLAGS.FeatureGates, FeatureGates);
}
