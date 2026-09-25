/** Minimal typings for the parts of `gifenc` (no bundled types) used by ImageResizeUtils */
declare module 'gifenc' {
  export type Palette = number[][];
  export interface GifEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: {
      palette?: Palette;
      transparent?: boolean;
      transparentIndex?: number;
      delay?: number;
      repeat?: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(options?: { auto?: boolean }): GifEncoder;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: {
    format?: 'rgb565' | 'rgb444' | 'rgba4444';
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
  }): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: 'rgb565' | 'rgb444' | 'rgba4444'): Uint8Array;
}
