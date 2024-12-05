import { STATES } from "@utils/global";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";


export function getPreferredServerRegion(shortName = false): string | null {
    let preferredRegion = getPref<ServerRegionName>(PrefKey.SERVER_REGION);
    const serverRegions = STATES.serverRegions;

    // Return preferred region
    if (preferredRegion in serverRegions) {
        if (shortName && serverRegions[preferredRegion].shortName) {
            return serverRegions[preferredRegion].shortName;
        } else {
            return preferredRegion;
        }
    }

    // Get default region
    for (let regionName in serverRegions) {
        const region = serverRegions[regionName];
        if (!region.isDefault) {
            continue;
        }

        if (shortName && region.shortName) {
            return region.shortName;
        } else {
            return regionName;
        }
    }

    return null;
}
