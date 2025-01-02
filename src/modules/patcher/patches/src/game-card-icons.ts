declare const $supportedInputIcons$: Array<any>;
declare const $param$: { productId: string };

const supportedInputIcons = $supportedInputIcons$;
const { productId } = $param$;

if (window.BX_EXPOSED.localCoOpManager.isSupported(productId)) {
    supportedInputIcons.push(() => window.BX_EXPOSED.createReactLocalCoOpIcon());
}
