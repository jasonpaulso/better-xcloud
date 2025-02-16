// Enable FO76 automation feature
export default {
    name: 'fo76-automation-enable',
    description: 'Enable FO76 automation feature',
    code: `
    // Initialize FO76 automation handler
    const fo76AutomationHandler = FO76AutomationHandler.getInstance();
    fo76AutomationHandler.init();

    // Expose FO76 automation handler to window for debugging
    window.BX_EXPOSED.fo76AutomationHandler = fo76AutomationHandler;
  `,
} 