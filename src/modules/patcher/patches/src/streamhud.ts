// @ts-ignore
declare const arguments: any;

const options = arguments[0];

// Expose onShowStreamMenu
window.BX_EXPOSED.showStreamMenu = options.onShowStreamMenu;
// Restore the "..." button
options.guideUI = null;

window.BX_EXPOSED.reactUseEffect(() => {
    window.BxEventBus.Stream.emit('ui.streamHud.expanded', { state: options.offset.x < 0 ? 'collapsed' : 'expanded' });
});
