import { NATIVE_FETCH } from "./bx-flags";
import { BxLogger } from "./bx-logger";
import { STATES } from "./global";

export class XcloudApi {
    private static instance: XcloudApi;
    public static getInstance = () => XcloudApi.instance ?? (XcloudApi.instance = new XcloudApi());
    private readonly LOG_TAG = 'XcloudApi';

    private CACHE_TITLES: {[key: string]: XcloudTitleInfo} = {};
    private CACHE_WAIT_TIME: {[key: string]: XcloudWaitTimeInfo} = {};

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');
    }

    async getTitleInfo(id: string): Promise<XcloudTitleInfo | null> {
        if (id in this.CACHE_TITLES) {
            return this.CACHE_TITLES[id];
        }

        const baseUri = STATES.selectedRegion.baseUri;
        if (!baseUri || !STATES.gsToken) {
            return null;
        }

        let json;
        try {
            const response = await NATIVE_FETCH(`${baseUri}/v2/titles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${STATES.gsToken}`,
                    'Content-Type': 'application/json',
                },

                // format the data
                body: JSON.stringify({
                    alternateIds: [id],
                    alternateIdType: 'productId',
                }),
            });

            json = (await response.json()).results[0];
        } catch (e) {
            json = {}
        }
        this.CACHE_TITLES[id] = json;
        return json;
    }

    async getWaitTime(id: string): Promise<XcloudWaitTimeInfo | null> {
        if (id in this.CACHE_WAIT_TIME) {
            return this.CACHE_WAIT_TIME[id];
        }

        const baseUri = STATES.selectedRegion.baseUri;
        if (!baseUri || !STATES.gsToken) {
            return null;
        }

        let json;
        try {
            const response = await NATIVE_FETCH(`${baseUri}/v1/waittime/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${STATES.gsToken}`,
                },
            });

            json = await response.json();
        } catch (e) {
            json = {};
        }

        this.CACHE_WAIT_TIME[id] = json;
        return json;
    }
}
