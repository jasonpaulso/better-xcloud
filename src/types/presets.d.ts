import type { GamepadKey } from "@/enums/gamepad";
import { MouseButtonCode, WheelCode } from "@/enums/mkb";
import { MouseMapTo, MkbPresetKey, type KeyCode } from "@/enums/mkb";
import type { ShortcutAction } from "@/enums/shortcut-actions";
import type { KeyEventInfo } from "@/modules/mkb/key-helper";

interface PresetRecord extends BaseRecord {
    id: number;
    name: string;
    data: {};
};

interface PresetRecords<T extends PresetRecord> {
    [key: number]: T;
  }


interface MkbPresetRecord extends PresetRecord {
    data: MkbPresetData;
};

type MkbPresetRecords = PresetRecords<MkbPresetRecord>;

type MkbPresetData = {
    mapping: Partial<Record<GamepadKey, Array<KeyCode | MouseButtonCode | WheelCode | null>>>;
    mouse: Omit<{
        [index in MkbPresetKey]: number;
    }, MkbPresetKey.MOUSE_MAP_TO> & {
        [MkbPresetKey.MOUSE_MAP_TO]: MouseMapTo;
    };
};

interface MkbConvertedPresetRecord extends PresetRecord {
    data: MkbConvertedPresetData;
};

type MkbConvertedPresetData = MkbPresetData & {
    mapping: Record<string, number?>;
};

interface ControllerShortcutPresetRecord extends PresetRecord {
    data: ControllerShortcutPresetData;
};

type ControllerShortcutPresetRecords = PresetRecords<ControllerShortcutPresetRecord>;

type ControllerShortcutPresetData = {
    mapping: Partial<Record<GamepadKey, ShortcutAction>>,
};

interface KeyboardShortcutPresetRecord extends PresetRecord {
    data: KeyboardShortcutPresetData;
};

type KeyboardShortcutPresetRecords = PresetRecords<KeyboardShortcutPresetRecord>;

type KeyboardShortcutPresetData = {
    mapping: Partial<Record<ShortcutAction, KeyEventInfo>>,
};

type KeyboardShortcutConvertedPresetData = KeyboardShortcutPresetData & {
    mapping: { [key: string]: ShortcutAction };
};

interface AllPresets<T extends PresetRecord> {
    default: Array<number>,
    custom: Array<number>,
    data: { [key: string]: T },
};

interface AllPresetsData<T extends PresetRecord> {
    [presetId: string]: T['data'],
};
