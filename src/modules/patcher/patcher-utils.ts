import type { PatchArray, PatchName, PatchPage } from "./patcher";

export class PatcherUtils {
    static indexOf(txt: string, searchString: string, startIndex: number, maxRange=0, after=false): number {
        if (startIndex < 0) {
            return -1;
        }

        const index = txt.indexOf(searchString, startIndex);
        if (index < 0 || (maxRange && index - startIndex > maxRange)) {
            return -1;
        }

        return after ? index + searchString.length : index;
    }

    static lastIndexOf(txt: string, searchString: string, startIndex: number, maxRange=0, after=false): number {
        if (startIndex < 0) {
            return -1;
        }

        const index = txt.lastIndexOf(searchString, startIndex);
        if (index < 0 || (maxRange && startIndex - index > maxRange)) {
            return -1;
        }

        return after ? index + searchString.length : index;
    }

    static insertAt(txt: string, index: number, insertString: string): string {
        return txt.substring(0, index) + insertString + txt.substring(index);
    }

    static replaceWith(txt: string, index: number, fromString: string, toString: string): string {
        return txt.substring(0, index) + toString + txt.substring(index + fromString.length);
    }

    static filterPatches(patches: Array<string | false>): PatchArray {
        return patches.filter((item): item is PatchName => !!item);
    }

    static patchBeforePageLoad(str: string, page: PatchPage): string | false {
        let text = `chunkName:()=>"${page}-page",`;
        if (!str.includes(text)) {
            return false;
        }

        str = str.replace('requireAsync(e){', `requireAsync(e){window.BX_EXPOSED.beforePageLoad("${page}");`);
        str = str.replace('requireSync(e){', `requireSync(e){window.BX_EXPOSED.beforePageLoad("${page}");`);

        return str;
    }
}
