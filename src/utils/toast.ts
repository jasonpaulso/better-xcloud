import { CE } from "@utils/html";
import { BxLogger } from "./bx-logger";

type ToastOptions = {
    instant?: boolean;
    html?: boolean;
    persistent?: boolean; // Whether the toast should persist and not auto-hide
}

// Type for the message parameter which can be string or HTMLElement
type ToastMessage = string | HTMLElement;

export class Toast {
    private static instance: Toast;
    public static getInstance = () => Toast.instance ?? (Toast.instance = new Toast());
    private readonly LOG_TAG = 'Toast';

    private $wrapper: HTMLElement;
    private $msg: HTMLElement;
    private $status: HTMLElement;

    private stack: Array<[ToastMessage, string, ToastOptions]> = [];
    private isShowing = false;
    private isPersistent = false;

    private timeoutId?: number | null;
    private DURATION = 3000;

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.$wrapper = CE('div', {class: 'bx-toast bx-offscreen'},
            this.$msg = CE('span', {class: 'bx-toast-msg'}),
            this.$status = CE('span', {class: 'bx-toast-status'}),
        );

        this.$wrapper.addEventListener('transitionend', e => {
            const classList = this.$wrapper.classList;
            if (classList.contains('bx-hide')) {
                classList.remove('bx-offscreen', 'bx-hide');
                classList.add('bx-offscreen');

                this.showNext();
            }
        });

        document.documentElement.appendChild(this.$wrapper);
    }

    private show(msg: ToastMessage, status?: string, options: Partial<ToastOptions> = {}) {
        options = options || {};
        
        // If there's a persistent toast showing and this is not an update to it
        if (this.isPersistent && !options.persistent) {
            // Add to queue to show after the persistent toast is closed
            this.stack.push([msg, status || '', options as ToastOptions]);
            return;
        }

        // If this is a persistent toast or an update to the current persistent toast
        if (options.persistent) {
            this.isPersistent = true;
            // If already showing, update the content
            if (this.isShowing) {
                this.updateToastContent(msg, status, options);
                return;
            }
        }

        const args = [msg, status, options] as [ToastMessage, string, ToastOptions];
        if (options.instant) {
            // Clear stack
            this.stack = [args];
            this.showNext();
        } else {
            this.stack.push(args);
            !this.isShowing && this.showNext();
        }
    }

    private updateToastContent(msg: ToastMessage, status?: string, options: Partial<ToastOptions> = {}) {
        // Clear previous content
        this.$msg.innerHTML = '';
        
        if (msg instanceof HTMLElement) {
            // If msg is an HTML element, append it to the message container
            this.$msg.appendChild(msg);
        } else if (options && options.html) {
            // If msg is a string and html option is true
            this.$msg.innerHTML = msg;
        } else {
            // If msg is a string and html option is false
            this.$msg.textContent = msg;
        }

        if (status) {
            this.$status.classList.remove('bx-gone');
            this.$status.textContent = status;
        } else {
            this.$status.classList.add('bx-gone');
        }
    }

    private showNext() {
        if (!this.stack.length) {
            this.isShowing = false;
            this.isPersistent = false;
            return;
        }

        this.isShowing = true;

        // Get values from item
        const [msg, status, options] = this.stack.shift()!;
        
        // Update toast content
        this.updateToastContent(msg, status, options);

        // Set up auto-hide for non-persistent toasts
        if (options.persistent) {
            this.isPersistent = true;
            // Clear any existing timeout
            this.timeoutId && clearTimeout(this.timeoutId);
            this.timeoutId = null;
        } else {
            this.timeoutId && clearTimeout(this.timeoutId);
            this.timeoutId = window.setTimeout(this.hide.bind(this), this.DURATION);
        }

        const classList = this.$wrapper.classList;
        classList.remove('bx-offscreen', 'bx-hide');
        classList.add('bx-show');
    }

    private hide() {
        this.timeoutId = null;
        this.isPersistent = false;

        const classList = this.$wrapper.classList;
        classList.remove('bx-show');
        classList.add('bx-hide');
    }

    static show(msg: ToastMessage, status?: string, options: Partial<ToastOptions> = {}) {
        Toast.getInstance().show(msg, status, options);
    }

    static showNext() {
        Toast.getInstance().showNext();
    }

    static update(msg: ToastMessage, status?: string, options: Partial<ToastOptions> = {}) {
        // Force the persistent option for updates
        options.persistent = true;
        Toast.getInstance().show(msg, status, options);
    }

    static hide() {
        Toast.getInstance().hide();
    }
}

/**
 * A specialized toast for displaying countdowns that won't interfere with regular toasts
 */
export class CountdownToast {
    private static instance: CountdownToast;
    public static getInstance = () => CountdownToast.instance ?? (CountdownToast.instance = new CountdownToast());
    private readonly LOG_TAG = 'CountdownToast';

    private $wrapper: HTMLElement;
    private $content: HTMLElement;
    private isShowing = false;

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.$wrapper = CE('div', {class: 'bx-countdown-toast bx-offscreen'},
            this.$content = CE('div', {class: 'bx-countdown-content'})
        );

        // Apply the styles directly to avoid needing additional CSS
        this.$wrapper.style.display = 'flex';
        this.$wrapper.style.height = '5%';
        this.$wrapper.style.position = 'fixed';
        this.$wrapper.style.bottom = '2%'; // Position above regular toast
        this.$wrapper.style.left = '50%';
        this.$wrapper.style.transform = 'translateX(-50%)';
        this.$wrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.$wrapper.style.color = 'white';
        this.$wrapper.style.padding = '8px 16px';
        this.$wrapper.style.borderRadius = '4px';
        this.$wrapper.style.zIndex = '10000';
        this.$wrapper.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        this.$wrapper.style.opacity = '0';
        this.$wrapper.style.pointerEvents = 'auto'; // Make it non-interactive

        document.documentElement.appendChild(this.$wrapper);
    }

    show(content: HTMLElement | string) {
        // Clear previous content
        this.$content.innerHTML = '';
        
        if (content instanceof HTMLElement) {
            this.$content.appendChild(content);
        } else {
            this.$content.textContent = content;
        }

        if (!this.isShowing) {
            this.isShowing = true;
            this.$wrapper.classList.remove('bx-offscreen');
            this.$wrapper.style.opacity = '1';
        }
    }

    hide() {
        if (this.isShowing) {
            this.isShowing = false;
            this.$wrapper.style.opacity = '0';
            setTimeout(() => {
                if (!this.isShowing) {
                    this.$wrapper.classList.add('bx-offscreen');
                }
            }, 300); // Match the transition duration
        }
    }

    updateContent(content: HTMLElement | string) {
        if (!this.isShowing) {
            this.show(content);
            return;
        }

        // Just update the content without hiding/showing
        this.$content.innerHTML = '';
        if (content instanceof HTMLElement) {
            this.$content.appendChild(content);
        } else {
            this.$content.textContent = content;
        }
    }

    static show(content: HTMLElement | string) {
        CountdownToast.getInstance().show(content);
    }

    static hide() {
        CountdownToast.getInstance().hide();
    }

    static update(content: HTMLElement | string) {
        CountdownToast.getInstance().updateContent(content);
    }
}
