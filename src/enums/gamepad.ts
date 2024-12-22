import { PrompFont } from "./prompt-font";

export enum GamepadKey {
    A = 0,
    B = 1,
    X = 2,
    Y = 3,
    LB = 4,
    RB = 5,
    LT = 6,
    RT = 7,
    SELECT = 8,
    START = 9,
    L3 = 10,
    R3 = 11,
    UP = 12,
    DOWN = 13,
    LEFT = 14,
    RIGHT = 15,
    HOME = 16,
    SHARE = 17,

    LS_UP = 100,
    LS_DOWN = 101,
    LS_LEFT = 102,
    LS_RIGHT = 103,
    LS = 104,

    RS_UP = 200,
    RS_DOWN = 201,
    RS_LEFT = 202,
    RS_RIGHT = 203,
    RS = 204,
};

export const GamepadKeyName: Record<number, [string, PrompFont]> = {
    [GamepadKey.A]: ['A', PrompFont.A],
    [GamepadKey.B]: ['B', PrompFont.B],
    [GamepadKey.X]: ['X', PrompFont.X],
    [GamepadKey.Y]: ['Y', PrompFont.Y],

    [GamepadKey.LB]: ['LB', PrompFont.LB],
    [GamepadKey.RB]: ['RB', PrompFont.RB],
    [GamepadKey.LT]: ['LT', PrompFont.LT],
    [GamepadKey.RT]: ['RT', PrompFont.RT],

    [GamepadKey.SELECT]: ['Select', PrompFont.SELECT],
    [GamepadKey.START]: ['Start', PrompFont.START],
    [GamepadKey.HOME]: ['Home', PrompFont.HOME],

    [GamepadKey.UP]: ['D-Pad Up', PrompFont.UP],
    [GamepadKey.DOWN]: ['D-Pad Down', PrompFont.DOWN],
    [GamepadKey.LEFT]: ['D-Pad Left', PrompFont.LEFT],
    [GamepadKey.RIGHT]: ['D-Pad Right', PrompFont.RIGHT],

    [GamepadKey.L3]: ['L3', PrompFont.L3],
    [GamepadKey.LS_UP]: ['Left Stick Up', PrompFont.LS_UP],
    [GamepadKey.LS_DOWN]: ['Left Stick Down', PrompFont.LS_DOWN],
    [GamepadKey.LS_LEFT]: ['Left Stick Left', PrompFont.LS_LEFT],
    [GamepadKey.LS_RIGHT]: ['Left Stick Right', PrompFont.LS_RIGHT],
    [GamepadKey.LS]: ['Left Stick', PrompFont.LS],

    [GamepadKey.R3]: ['R3', PrompFont.R3],
    [GamepadKey.RS_UP]: ['Right Stick Up', PrompFont.RS_UP],
    [GamepadKey.RS_DOWN]: ['Right Stick Down', PrompFont.RS_DOWN],
    [GamepadKey.RS_LEFT]: ['Right Stick Left', PrompFont.RS_LEFT],
    [GamepadKey.RS_RIGHT]: ['Right Stick Right', PrompFont.RS_RIGHT],
    [GamepadKey.RS]: ['Right Stick', PrompFont.RS],

    [GamepadKey.SHARE]: ['Screenshot', PrompFont.SHARE],
};


export enum GamepadStick {
    LEFT = 0,
    RIGHT = 1,
};
