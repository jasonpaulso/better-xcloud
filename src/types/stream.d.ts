import type { StreamVideoProcessing } from "@/enums/pref-values";

type StreamPlayerOptions = {
    processing: StreamVideoProcessing,
    sharpness: number,
    saturation: number,
    contrast: number,
    brightness: number,
};
