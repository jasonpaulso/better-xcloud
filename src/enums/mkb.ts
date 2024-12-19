export const enum MouseConstant {
    DEFAULT_PANNING_SENSITIVITY = 0.0010,
    DEFAULT_DEADZONE_COUNTERWEIGHT = 0.01,
    MAXIMUM_STICK_RANGE = 1.1,
}


export const enum MouseButtonCode {
    LEFT_CLICK = 'Mouse0',
    RIGHT_CLICK = 'Mouse2',
    MIDDLE_CLICK = 'Mouse1',
};


export const enum MouseMapTo {
    OFF = 0,
    LS = 1,
    RS = 2,
}


export const enum WheelCode {
    SCROLL_UP = 'ScrollUp',
    SCROLL_DOWN = 'ScrollDown',
    SCROLL_LEFT = 'ScrollLeft',
    SCROLL_RIGHT = 'ScrollRight',
};


export const enum MkbPresetKey {
    MOUSE_MAP_TO = 'mapTo',

    MOUSE_SENSITIVITY_X = 'sensitivityX',
    MOUSE_SENSITIVITY_Y = 'sensitivityY',

    MOUSE_DEADZONE_COUNTERWEIGHT = 'deadzoneCounterweight',
}


export type KeyCode =
  | 'Backspace'
  | 'Tab'
  | 'Enter'
  | 'ShiftLeft'
  | 'ShiftRight'
  | 'ControlLeft'
  | 'ControlRight'
  | 'AltLeft'
  | 'AltRight'
  | 'Pause'
  | 'CapsLock'
  | 'Escape'
  | 'Space'
  | 'PageUp'
  | 'PageDown'
  | 'End'
  | 'Home'
  | 'ArrowLeft'
  | 'ArrowUp'
  | 'ArrowRight'
  | 'ArrowDown'
  | 'PrintScreen'
  | 'Insert'
  | 'Delete'
  | 'Digit0'
  | 'Digit1'
  | 'Digit2'
  | 'Digit3'
  | 'Digit4'
  | 'Digit5'
  | 'Digit6'
  | 'Digit7'
  | 'Digit8'
  | 'Digit9'
  | 'KeyA'
  | 'KeyB'
  | 'KeyC'
  | 'KeyD'
  | 'KeyE'
  | 'KeyF'
  | 'KeyG'
  | 'KeyH'
  | 'KeyI'
  | 'KeyJ'
  | 'KeyK'
  | 'KeyL'
  | 'KeyM'
  | 'KeyN'
  | 'KeyO'
  | 'KeyP'
  | 'KeyQ'
  | 'KeyR'
  | 'KeyS'
  | 'KeyT'
  | 'KeyU'
  | 'KeyV'
  | 'KeyW'
  | 'KeyX'
  | 'KeyY'
  | 'KeyZ'
  | 'MetaLeft'
  | 'MetaRight'
  | 'ContextMenu'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'NumLock'
  | 'ScrollLock'
  | 'AudioVolumeMute'
  | 'AudioVolumeDown'
  | 'AudioVolumeUp'
  | 'MediaTrackNext'
  | 'MediaTrackPrevious'
  | 'MediaStop'
  | 'MediaPlayPause'
  | 'LaunchMail'
  | 'LaunchMediaPlayer'
  | 'LaunchApplication1'
  | 'LaunchApplication2'
  | 'Semicolon'
  | 'Equal'
  | 'Comma'
  | 'Minus'
  | 'Period'
  | 'Slash'
  | 'Backquote'
  | 'BracketLeft'
  | 'Backslash'
  | 'BracketRight'
  | 'Quote'
  | 'Numpad0'
  | 'Numpad1'
  | 'Numpad2'
  | 'Numpad3'
  | 'Numpad4'
  | 'Numpad5'
  | 'Numpad6'
  | 'Numpad7'
  | 'Numpad8'
  | 'Numpad9'
  | 'NumpadMultiply'
  | 'NumpadAdd'
  | 'NumpadSubtract'
  | 'NumpadDecimal'
  | 'NumpadDivide';

export type KeyCodeExcludeModifiers = Exclude<KeyCode,
    'ShiftLeft'
    | 'ShiftRight'
    | 'ControlLeft'
    | 'ControlRight'
    | 'AltLeft'
    | 'AltRight'
>

export const enum KeyModifier {
    CTRL = 1,
    ALT = 2,
    SHIFT = 4,
}
