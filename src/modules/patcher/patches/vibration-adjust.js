const gamepad = e.gamepad;
if (gamepad?.connected) {
    const gamepadSettings = window.BX_STREAM_SETTINGS.controllers[gamepad.id];
    if (gamepadSettings) {
        const intensity = gamepadSettings.vibrationIntensity;

        if (intensity === 0) {
            return void(e.repeat = 0);
        } else if (intensity < 1) {
            e.leftMotorPercent *= intensity;
            e.rightMotorPercent *= intensity;
            e.leftTriggerMotorPercent *= intensity;
            e.rightTriggerMotorPercent *= intensity;
        }
    }
}
