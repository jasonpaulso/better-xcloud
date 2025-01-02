import { BxEventBus } from "./bx-event-bus";
import { GhPagesUtils } from "./gh-pages";

export class LocalCoOpManager {
    private static instance: LocalCoOpManager;
    public static getInstance = () => LocalCoOpManager.instance ?? (LocalCoOpManager.instance = new LocalCoOpManager());

    private supportedIds: string[] = [];

    constructor() {
        BxEventBus.Script.once('list.localCoOp.updated', e => {
            this.supportedIds = Object.keys(e.data.data);
            console.log('supportedIds', this.supportedIds);
        });
        GhPagesUtils.getLocalCoOpList();
    }

    isSupported(productId: string) {
        return this.supportedIds.includes(productId);
    }
}
