import { applyPalette, GIFEncoder, quantize } from 'gifenc';

export interface ImageSize {
  width: number;
  height: number;
}

export interface ResizeOptions {
  /** Target width in px; null / 0 = auto (only allowed with keepAspectRatio) */
  width: number | null;
  /** Target height in px; null / 0 = auto (only allowed with keepAspectRatio) */
  height: number | null;
  /** Fit inside width x height keeping proportions (iloveimg "Maintain aspect ratio") */
  keepAspectRatio: boolean;
  /** Never upscale an image that is already smaller than the target */
  noEnlarge: boolean;
}

export class ImageResizeUtils {
  /**
   * Types we can write: canvas encodes JPEG / PNG, GIF goes through `gifenc`, SVG is written here.
   * Anything else (webp, bmp, avif…) is saved as PNG when "Original" is chosen.
   */
  static readonly OUTPUT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
  static readonly SVG = 'image/svg+xml';

  /**
   * Output size for one image.
   * - keepAspectRatio: scale to fit inside the box; a blank side is derived from the other.
   * - otherwise: exact width x height (a blank side keeps the original).
   * Both sides blank = keep the original size (format conversion only).
   */
  static targetSize(original: ImageSize, options: ResizeOptions): ImageSize {
    const width = options.width && options.width > 0 ? options.width : null;
    const height = options.height && options.height > 0 ? options.height : null;
    if (!width && !height) return { ...original };

    let target: ImageSize;
    if (options.keepAspectRatio) {
      const scale = Math.min(
        width ? width / original.width : Infinity,
        height ? height / original.height : Infinity,
      );
      target = { width: original.width * scale, height: original.height * scale };
    } else {
      target = { width: width ?? original.width, height: height ?? original.height };
    }

    if (options.noEnlarge && (target.width > original.width || target.height > original.height)) {
      if (options.keepAspectRatio) return { ...original };
      target = { width: Math.min(target.width, original.width), height: Math.min(target.height, original.height) };
    }

    return { width: Math.max(1, Math.round(target.width)), height: Math.max(1, Math.round(target.height)) };
  }

  /** Height (or width) that keeps `original`'s proportions for the given other side */
  static proportional(original: ImageSize, side: 'width' | 'height', value: number): number {
    return side === 'width'
      ? Math.max(1, Math.round((value * original.height) / original.width))
      : Math.max(1, Math.round((value * original.width) / original.height));
  }

  /** `format` = a MIME type from OUTPUT_TYPES, or '' to keep the input's own type */
  static outputType(inputType: string, format = ''): string {
    if (ImageResizeUtils.OUTPUT_TYPES.includes(format)) return format;
    return ImageResizeUtils.OUTPUT_TYPES.includes(inputType) ? inputType : 'image/png';
  }

  /** Short name shown in the UI: image/jpeg -> JPG, image/svg+xml -> SVG */
  static label(type: string): string {
    return ImageResizeUtils.extension(type).toUpperCase();
  }

  static extension(type: string): string {
    if (type === 'image/jpeg') return 'jpg';
    return (type.split('/')[1] ?? 'img').replace(/\+.*$/, '');
  }

  /** `photo.jpeg` + 800x600 + image/png -> `photo-800x600.png` */
  static outputName(fileName: string, size: ImageSize, type: string): string {
    const base = fileName.replace(/\.[^.]+$/, '') || 'image';
    return `${base}-${size.width}x${size.height}.${ImageResizeUtils.extension(type)}`;
  }

  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  /**
   * Opens an image file. SVG (which `createImageBitmap` can't decode from a Blob) goes through an <img>;
   * an SVG without width / height gets the browser default 300×150. Animated GIF = first frame.
   */
  static async load(file: Blob): Promise<ImageBitmap> {
    if (file.type !== ImageResizeUtils.SVG) return createImageBitmap(file);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const width = image.naturalWidth || 300;
      const height = image.naturalHeight || 150;
      return await createImageBitmap(image, { resizeWidth: width, resizeHeight: height });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Draws `source` at `size` and encodes it (JPEG gets a white background — it has no alpha) */
  static async resize(source: CanvasImageSource, size: ImageSize, type: string, quality = 0.92): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d')!;
    if (type === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, size.width, size.height);

    if (type === 'image/gif') {
      return ImageResizeUtils.encodeGif(context.getImageData(0, 0, size.width, size.height));
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(result => (result ? resolve(result) : reject(new Error('Encode failed'))),
        type === ImageResizeUtils.SVG ? 'image/png' : type, quality));
    return type === ImageResizeUtils.SVG ? ImageResizeUtils.embedInSvg(blob, size) : blob;
  }

  /** 256-colour GIF; fully transparent pixels stay transparent */
  static encodeGif(image: ImageData): Blob {
    const { width, height, data } = image;
    const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
    const index = applyPalette(data, palette, 'rgba4444');
    const transparentIndex = palette.findIndex(color => color[3] === 0);
    const gif = GIFEncoder();
    gif.writeFrame(index, width, height, { palette, transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex) });
    gif.finish();
    return new Blob([gif.bytes() as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
  }

  /** Raster -> SVG: the pixels are embedded as a PNG (this is not vector tracing) */
  static async embedInSvg(png: Blob, size: ImageSize): Promise<Blob> {
    const bytes = new Uint8Array(await png.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">`
      + `<image width="${size.width}" height="${size.height}" href="data:image/png;base64,${btoa(binary)}"/></svg>`;
    return new Blob([svg], { type: ImageResizeUtils.SVG });
  }

  /**
   * SVG -> SVG stays vector: only the root's width / height change (a viewBox is added from the
   * original size when missing, and `stretch` turns off proportional scaling).
   */
  static async resizeSvg(file: Blob, original: ImageSize, size: ImageSize, stretch: boolean): Promise<Blob> {
    const document = new DOMParser().parseFromString(await file.text(), ImageResizeUtils.SVG);
    const root = document.documentElement;
    if (root.nodeName !== 'svg' || document.querySelector('parsererror')) throw new Error('Invalid SVG');
    if (!root.hasAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${original.width} ${original.height}`);
    root.setAttribute('width', String(size.width));
    root.setAttribute('height', String(size.height));
    if (stretch) root.setAttribute('preserveAspectRatio', 'none');
    return new Blob([new XMLSerializer().serializeToString(document)], { type: ImageResizeUtils.SVG });
  }
}
