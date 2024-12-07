import type { BxIcon } from "@utils/bx-icon";
import { setNearby } from "./navigation-utils";
import type { NavigationNearbyElements } from "@/modules/ui/dialog/navigation-dialog";
import type { PresetRecord, AllPresets } from "@/types/presets";
import { t } from "./translation";

export enum ButtonStyle {
    PRIMARY = 1,
    WARNING = 1 << 1,
    DANGER = 1 << 2,
    GHOST = 1 << 3,
    FROSTED = 1 << 4,
    DROP_SHADOW = 1 << 5,
    FOCUSABLE = 1 << 6,
    FULL_WIDTH = 1 << 7,
    FULL_HEIGHT = 1 << 8,
    TALL = 1 << 9,
    CIRCULAR = 1 << 10,
    NORMAL_CASE = 1 << 11,
    NORMAL_LINK = 1 << 12,
}

const ButtonStyleClass = {
    [ButtonStyle.PRIMARY]: 'bx-primary',
    [ButtonStyle.WARNING]: 'bx-warning',
    [ButtonStyle.DANGER]: 'bx-danger',
    [ButtonStyle.GHOST]: 'bx-ghost',
    [ButtonStyle.FROSTED]: 'bx-frosted',
    [ButtonStyle.DROP_SHADOW]: 'bx-drop-shadow',
    [ButtonStyle.FOCUSABLE]: 'bx-focusable',
    [ButtonStyle.FULL_WIDTH]: 'bx-full-width',
    [ButtonStyle.FULL_HEIGHT]: 'bx-full-height',
    [ButtonStyle.TALL]: 'bx-tall',
    [ButtonStyle.CIRCULAR]: 'bx-circular',
    [ButtonStyle.NORMAL_CASE]: 'bx-normal-case',
    [ButtonStyle.NORMAL_LINK]: 'bx-normal-link',
}

export type BxButtonOptions = Partial<{
    style: ButtonStyle;
    url: string;
    classes: string[];
    icon: typeof BxIcon;
    label: string;
    secondaryText: HTMLElement | string;
    title: string;
    disabled: boolean;
    onClick: EventListener;
    tabIndex: number;
    attributes: {[key: string]: any},
}>;

export type SettingsRowOptions = Partial<{
    multiLines: boolean;
    $note: HTMLElement;
}>;

// Quickly create a tree of elements without having to use innerHTML
type CreateElementOptions = {
    [index: string]: any;
    _on?: {
        [ key: string ]: (e: Event) => void;
    };
    _dataset?: {
        [ key: string ]: string | number;
    };
    _nearby?: NavigationNearbyElements;
};


function createElement<T=HTMLElement>(elmName: string, props: CreateElementOptions={}, ..._: any): T {
    let $elm;
    const hasNs = 'xmlns' in props;

    // console.trace('createElement', elmName, props);

    if (hasNs) {
        $elm = document.createElementNS(props.xmlns, elmName);
        delete props.xmlns;
    } else {
        $elm = document.createElement(elmName);
    }

    if (props._nearby) {
        setNearby($elm, props._nearby);
        delete props._nearby;
    }

    if (props._on) {
        for (const name in props._on) {
            $elm.addEventListener(name, props._on[name]);
        }
        delete props._on;
    }

    if (props._dataset) {
        for (const name in props._dataset) {
            $elm.dataset[name] = props._dataset[name] as string;
        }
        delete props._dataset;
    }

    for (const key in props) {
        if ($elm.hasOwnProperty(key)) {
            continue;
        }

        const value = props[key];
        if (hasNs) {
            $elm.setAttributeNS(null, key, value);
        } else {
            $elm.setAttribute(key, value);
        }
    }

    for (let i = 2, size = arguments.length; i < size; i++) {
        const arg = arguments[i];

        if (arg !== null && arg !== false && typeof arg !== 'undefined') {
            $elm.append(arg);
        }
    }

    return $elm as T;
}


const domParser = new DOMParser();
export function createSvgIcon(icon: typeof BxIcon) {
    return domParser.parseFromString(icon.toString(), 'image/svg+xml').documentElement;
}

const ButtonStyleIndices = Object.keys(ButtonStyleClass).map(i => parseInt(i));

export function createButton<T=HTMLButtonElement>(options: BxButtonOptions): T {
    let $btn;

    // Create base button element
    if (options.url) {
        $btn = CE<HTMLAnchorElement>('a', {
            class: 'bx-button',
            href: options.url,
            target: '_blank',
        });
    } else {
        $btn = CE<HTMLButtonElement>('button', {
            class: 'bx-button',
            type: 'button',
        });

        options.disabled && ($btn.disabled = true);
    }

    // Add button styles
    const style = (options.style || 0) as number;
    if (style) {
        let index: keyof typeof ButtonStyleClass;
        for (index of ButtonStyleIndices) {
            (style & index) && $btn.classList.add(ButtonStyleClass[index] as string);
        }
    }

    options.classes && $btn.classList.add(...options.classes);

    options.icon && $btn.appendChild(createSvgIcon(options.icon));
    options.label && $btn.appendChild(CE('span', {}, options.label));
    options.title && $btn.setAttribute('title', options.title);
    options.onClick && $btn.addEventListener('click', options.onClick);
    $btn.tabIndex = typeof options.tabIndex === 'number' ? options.tabIndex : 0;

    if (options.secondaryText) {
        $btn.classList.add('bx-button-multi-lines');
        $btn.appendChild(CE('span', {}, options.secondaryText));
    }

    for (const key in options.attributes) {
        if (!$btn.hasOwnProperty(key)) {
            $btn.setAttribute(key, options.attributes[key]);
        }
    }

    return $btn as T;
}

export function createSettingRow(label: string, $control: HTMLElement | false | undefined, options: SettingsRowOptions={}) {
    let $label: HTMLElement;

    const $row = CE<HTMLLabelElement>('label', { class: 'bx-settings-row' },
        $label = CE('span', {class: 'bx-settings-label'},
            label,
            options.$note,
        ),
        $control,
    );

    // Make link inside <label> focusable
    const $link = $label.querySelector('a');
    if ($link) {
        $link.classList.add('bx-focusable');
        setNearby($label, {
            focus: $link,
        });
    }

    setNearby($row, {
        orientation: options.multiLines ? 'vertical' : 'horizontal',
    });

    if (options.multiLines) {
        $row.dataset.multiLines = 'true';
    }

    if ($control instanceof HTMLElement && $control.id) {
        $row.htmlFor = $control.id;
    }

    return $row;
}

export function getReactProps($elm: HTMLElement): any | null {
    for (const key in $elm) {
        if (key.startsWith('__reactProps')) {
            return ($elm as any)[key];
        }
    }

    return null;
}

export function escapeHtml(html: string): string {
    const text = document.createTextNode(html);
    const $span = document.createElement('span');
    $span.appendChild(text);

    return $span.innerHTML;
}

export function isElementVisible($elm: HTMLElement): boolean {
    const rect = $elm.getBoundingClientRect();
    return (rect.x >= 0 || rect.y >= 0) && !!rect.width && !!rect.height;
}


export function removeChildElements($parent: HTMLElement) {
    if ($parent instanceof HTMLDivElement && $parent.classList.contains('bx-select')) {
        $parent = $parent.querySelector('select')!;
    }

    while ($parent.firstElementChild) {
        $parent.firstElementChild.remove();
    }
}

export function clearFocus() {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
}

export function clearDataSet($elm: HTMLElement) {
    Object.keys($elm.dataset).forEach(key => {
        delete $elm.dataset[key];
    });
}

export function renderPresetsList<T extends PresetRecord>($select: HTMLSelectElement, allPresets: AllPresets<T>, selectedValue: number | null, addOffValue=false) {
    removeChildElements($select);

    if (addOffValue) {
        const $option = CE<HTMLOptionElement>('option', { value: 0 }, t('off'));
        $option.selected = selectedValue === 0;

        $select.appendChild($option);
    }

    // Render options
    const groups = {
        default: t('default'),
        custom: t('custom'),
    };

    let key: keyof typeof groups;
    for (key in groups) {
        const $optGroup = CE('optgroup', { label: groups[key] });
        for (const id of allPresets[key]) {
            const record = allPresets.data[id];
            const $option = CE<HTMLOptionElement>('option', { value: record.id }, record.name);
            $option.selected = selectedValue === record.id;

            $optGroup.appendChild($option);
        }

        if ($optGroup.hasChildNodes()) {
            $select.appendChild($optGroup);
        }
    }
}

// https://stackoverflow.com/a/20732091
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
export function humanFileSize(size: number) {
    const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(1) + ' ' + FILE_SIZE_UNITS[i];
}

export function secondsToHm(seconds: number) {
    let h = Math.floor(seconds / 3600);
    let m = Math.floor(seconds % 3600 / 60) + 1;

    if (m === 60) {
        h += 1;
        m = 0;
    }

    const output = [];
    h > 0 && output.push(`${h}h`);
    m > 0 && output.push(`${m}m`);

    return output.join(' ');
}

export function secondsToHms(seconds: number) {
    let h = Math.floor(seconds / 3600);
    seconds %= 3600;
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;

    const output = [];
    h > 0 && output.push(`${h}h`);
    m > 0 && output.push(`${m}m`);
    if (s > 0 || output.length === 0) {
        output.push(`${s}s`);
    }

    return output.join(' ');
}

export function escapeCssSelector(name: string) {
    return name.replaceAll('.', '-');
}

export const CE = createElement;
window.BX_CE = createElement;
