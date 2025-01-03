import { BxEventBus } from "./bx-event-bus";
import { GhPagesUtils } from "./gh-pages";

export class LocalCoOpManager {
    private static instance: LocalCoOpManager;
    public static getInstance = () => LocalCoOpManager.instance ?? (LocalCoOpManager.instance = new LocalCoOpManager());

    private supportedIds: Set<string>;

    constructor() {
        BxEventBus.Script.once('list.localCoOp.updated', e => {
            this.supportedIds = e.ids;
        });
        this.supportedIds = GhPagesUtils.getLocalCoOpList();
        console.log('this.supportedIds', this.supportedIds);
    }

    isSupported(productId: string) {
        return this.supportedIds.has(productId);
    }
}
