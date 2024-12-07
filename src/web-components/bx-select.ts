import { PrefKey } from "@/enums/pref-keys";
import type { NavigationElement } from "@/modules/ui/dialog/navigation-dialog";
import { BxEvent } from "@/utils/bx-event";
import { setNearby } from "@/utils/navigation-utils";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { ButtonStyle, CE, clearDataSet, createButton } from "@utils/html";

export class BxSelectElement extends HTMLSelectElement {
    private optionsList!: HTMLOptionElement[];
    private indicatorsList!: HTMLElement[];
    private $indicators!: HTMLElement;
    private visibleIndex!: number;
    private isMultiple!: boolean;

    private $select!: HTMLSelectElement;
    private $btnNext!: HTMLButtonElement;
    private $btnPrev!: HTMLButtonElement;
    private $label!: HTMLLabelElement;
    private $checkBox!: HTMLInputElement;

    static create($select: HTMLSelectElement, forceFriendly=false): BxSelectElement {
        // Return normal <select> if not using controller-friendly UI
        if (!forceFriendly && !getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
            $select.classList.add('bx-select');
            // @ts-ignore
            return $select;
        }

        // Remove "tabindex" attribute from <select>
        $select.removeAttribute('tabindex');

        const $wrapper = CE<BxSelectElement & NavigationElement>('div', { class: 'bx-select' });
        const $btnPrev = createButton({
            label: '<',
            style: ButtonStyle.FOCUSABLE,
        });

        const $btnNext = createButton({
            label: '>',
            style: ButtonStyle.FOCUSABLE,
        });

        setNearby($wrapper, {
            orientation: 'horizontal',
            focus: $btnNext,
        });

        let $content;

        const self = $wrapper;
        self.isMultiple = $select.multiple;
        self.visibleIndex = $select.selectedIndex;

        self.$select = $select;
        self.optionsList = Array.from($select.querySelectorAll<HTMLOptionElement>('option'));
        self.$indicators = CE('div', { class: 'bx-select-indicators' });
        self.indicatorsList = [];
        self.$btnNext = $btnNext;
        self.$btnPrev = $btnPrev;

        if (self.isMultiple) {
            $content = CE('button', {
                class: 'bx-select-value bx-focusable',
                tabindex: 0,
            },
                CE('div', {},
                    self.$checkBox = CE('input', { type: 'checkbox' }),
                    self.$label = CE('span', {}, ''),
                ),

                self.$indicators,
            );

            $content.addEventListener('click', e => {
                self.$checkBox.click();
            });

            self.$checkBox.addEventListener('input', e => {
                const $option = BxSelectElement.getOptionAtIndex.call(self, self.visibleIndex);
                $option && ($option.selected = (e.target as HTMLInputElement).checked);

                BxEvent.dispatch($select, 'input');
            });
        } else {
            $content = CE('div', {},
                self.$label = CE('label', { for: $select.id + '_checkbox' }, ''),
                self.$indicators,
            );
        }

        const boundOnPrevNext = BxSelectElement.onPrevNext.bind(self);

        $select.addEventListener('input', BxSelectElement.render.bind(self));
        $btnPrev.addEventListener('click', boundOnPrevNext);
        $btnNext.addEventListener('click', boundOnPrevNext);

        const observer = new MutationObserver((mutationList, observer) => {
            mutationList.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    self.visibleIndex = $select.selectedIndex;
                    self.optionsList = Array.from($select.querySelectorAll<HTMLOptionElement>('option'));

                    BxSelectElement.resetIndicators.call(self);
                    BxSelectElement.render.call(self);
                }
            });
        });

        observer.observe($select, {
            subtree: true,
            childList: true,
            attributes: true,
        });

        self.append(
            $select,
            $btnPrev,
            $content,
            $btnNext,
        );

        BxSelectElement.resetIndicators.call(self);
        BxSelectElement.render.call(self);

        Object.defineProperty(self, 'value', {
            get() { return $select.value; },
            set(value) {
                self.optionsList = Array.from($select.querySelectorAll<HTMLOptionElement>('option'));

                $select.value = value;

                // Update visible index
                self.visibleIndex = $select.selectedIndex;
                // Re-render
                BxSelectElement.resetIndicators.call(self);
                BxSelectElement.render.call(self);
            },
        });

        Object.defineProperty(self, 'disabled', {
            get() { return $select.disabled; },
            set(value) { $select.disabled = value; },
        });

        self.addEventListener = function() {
            // @ts-ignore
            $select.addEventListener.apply($select, arguments);
        };

        self.removeEventListener = function() {
            // @ts-ignore
            $select.removeEventListener.apply($select, arguments);
        };

        self.dispatchEvent = function() {
            // @ts-ignore
            return $select.dispatchEvent.apply($select, arguments);
        };

        self.appendChild = function(node) {
            $select.appendChild(node);
            return node;
        };

        return self as BxSelectElement;
    }

    private static resetIndicators(this: BxSelectElement) {
        const {
            optionsList,
            indicatorsList,
            $indicators,
        } = this;

        const targetSize = optionsList.length;

        if (indicatorsList.length > targetSize) {
            // Detach indicator from parent
            while (indicatorsList.length > targetSize) {
                indicatorsList.pop()?.remove();
            }
        } else if (indicatorsList.length < targetSize) {
            // Add empty indicators
            while (indicatorsList.length < targetSize) {
                const $indicator = CE('span', {});
                indicatorsList.push($indicator);

                $indicators.appendChild($indicator);
            }
        }

        // Reset dataset
        for (const $indicator of indicatorsList) {
            clearDataSet($indicator);
        }

        // Toggle visibility
        $indicators.classList.toggle('bx-invisible', targetSize <= 1);
    }

    private static getOptionAtIndex(this: BxSelectElement, index: number): HTMLOptionElement | undefined {
        return this.optionsList[index];
    }

    private static render(this: BxSelectElement, e?: Event) {
        const {
            $label,
            $btnNext,
            $btnPrev,
            $checkBox,
            visibleIndex,
            optionsList,
            indicatorsList,
        } = this;

        // console.log('options', this.options, 'selectedIndices', this.selectedIndices, 'selectedOptions', this.selectedOptions);
        if (e && (e as any).manualTrigger) {
            this.visibleIndex = this.$select.selectedIndex;
        }

        this.visibleIndex = BxSelectElement.normalizeIndex.call(this, this.visibleIndex);
        const $option = BxSelectElement.getOptionAtIndex.call(this, this.visibleIndex);
        let content = '';
        if ($option) {
            const $parent = $option.parentElement!;
            const hasLabel = $parent instanceof HTMLOptGroupElement || this.$select.querySelector('optgroup');

            content = $option.textContent || '';
            if (content && hasLabel) {
                const groupLabel = $parent instanceof HTMLOptGroupElement ? $parent.label : ' ';

                $label.innerHTML = '';
                const fragment = document.createDocumentFragment();
                fragment.appendChild(CE('span', {}, groupLabel));
                fragment.appendChild(document.createTextNode(content));

                $label.appendChild(fragment);
            } else {
                $label.textContent = content;
            }
        } else {
            $label.textContent = content;
        }

        // Add line-through on disabled option
        $label.classList.toggle('bx-line-through', $option && $option.disabled);

        // Hide checkbox when the selection is empty
        if (this.isMultiple) {
            $checkBox.checked = $option?.selected || false;
            $checkBox.classList.toggle('bx-gone', !content);
        }

        // Disable buttons when there is only one option or fewer
        const disableButtons = optionsList.length <= 1;
        $btnPrev.classList.toggle('bx-inactive', disableButtons);
        $btnNext.classList.toggle('bx-inactive', disableButtons);

        // Update indicators
        for (let i = 0; i < optionsList.length; i++) {
            const $option = optionsList[i];
            const $indicator = indicatorsList[i];
            if (!$option || !$indicator) {
                continue;
            }

            clearDataSet($indicator);
            if ($option.selected) {
                $indicator.dataset.selected = 'true';
            }

            if ($option.index === visibleIndex) {
                $indicator.dataset.highlighted = 'true';
            }
        }
    }

    private static normalizeIndex(this: BxSelectElement, index: number): number {
        return Math.min(Math.max(index, 0), this.optionsList.length - 1);
    }

    private static onPrevNext(this: BxSelectElement, e: Event) {
        if (!e.target) {
            return;
        }

        const {
            $btnNext,
            $select,
            isMultiple,
            visibleIndex: currentIndex,
        } = this;

        const goNext = (e.target as HTMLElement).closest('button') === $btnNext;

        let newIndex = goNext ? currentIndex + 1 : currentIndex - 1;
        if (newIndex > this.optionsList.length - 1) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = this.optionsList.length - 1;
        }
        newIndex = BxSelectElement.normalizeIndex.call(this, newIndex);

        this.visibleIndex = newIndex;
        if (!isMultiple && newIndex !== currentIndex) {
            $select.selectedIndex = newIndex;
        }

        if (isMultiple) {
            BxSelectElement.render.call(this);
        } else {
            BxEvent.dispatch($select, 'input');
        }
    };
}
