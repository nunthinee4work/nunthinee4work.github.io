import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ImageResizeUtils, ImageSize } from './image-resize.utils';

export type PageSizeOption = 'fit' | 'a4' | 'letter';
export type OrientationOption = 'auto' | 'portrait' | 'landscape';

/** Where one image goes on its PDF page (points, origin bottom-left as in PDF) */
export interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfImageInput {
  /** JPEG / PNG bytes are embedded as-is; anything else is converted to PNG first */
  file: Blob;
  size: ImageSize;
}

export class PdfUtils {
  /** Portrait sizes in PDF points (1/72 inch) */
  static readonly PAGE_SIZES: Record<Exclude<PageSizeOption, 'fit'>, ImageSize> = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 },
  };
  /** pdf.js worker, copied from node_modules by angular.json (legacy build = wider browser support) */
  static readonly WORKER_SRC = 'pdfjs/pdf.worker.min.mjs';

  /**
   * "1-3, 5, 8-" -> [1, 2, 3, 5, 8, …, total]. Blank = every page.
   * Pages outside 1..total are dropped; returns null when the text can't be read.
   */
  static parsePageRange(text: string, total: number): number[] | null {
    const all = Array.from({ length: total }, (_, i) => i + 1);
    if (!text.trim()) return all;
    const pages = new Set<number>();
    for (const part of text.split(',').map(p => p.trim()).filter(Boolean)) {
      const match = /^(\d*)\s*(-)?\s*(\d*)$/.exec(part);
      if (!match || (!match[1] && !match[3])) return null;
      const from = match[1] ? Number(match[1]) : 1;
      const to = match[2] ? (match[3] ? Number(match[3]) : total) : from;
      for (let page = Math.min(from, to); page <= Math.max(from, to); page++) {
        if (page >= 1 && page <= total) pages.add(page);
      }
    }
    return [...pages].sort((a, b) => a - b);
  }

  /** Image size (px, drawn at 1 px = 1 pt) placed centred on the page, scaled down to fit inside the margin */
  static layout(image: ImageSize, pageSize: PageSizeOption, orientation: OrientationOption, margin: number): PageLayout {
    if (pageSize === 'fit') {
      return {
        pageWidth: image.width + margin * 2, pageHeight: image.height + margin * 2,
        x: margin, y: margin, width: image.width, height: image.height,
      };
    }
    const base = PdfUtils.PAGE_SIZES[pageSize];
    const landscape = orientation === 'landscape' || (orientation === 'auto' && image.width > image.height);
    const pageWidth = landscape ? base.height : base.width;
    const pageHeight = landscape ? base.width : base.height;
    const scale = Math.min(1, (pageWidth - margin * 2) / image.width, (pageHeight - margin * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
  }

  /** One page per image */
  static async imagesToPdf(images: PdfImageInput[], pageSize: PageSizeOption, orientation: OrientationOption, margin: number): Promise<Blob> {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    for (const image of images) {
      const embedded = image.file.type === 'image/jpeg'
        ? await pdf.embedJpg(await image.file.arrayBuffer())
        : await pdf.embedPng(await (await PdfUtils.toPng(image)).arrayBuffer());
      const place = PdfUtils.layout(image.size, pageSize, orientation, margin);
      const page = pdf.addPage([place.pageWidth, place.pageHeight]);
      page.drawImage(embedded, { x: place.x, y: place.y, width: place.width, height: place.height });
    }
    const bytes = await pdf.save();
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  }

  static async openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = PdfUtils.WORKER_SRC;
    return pdfjs.getDocument({ data }).promise;
  }

  /** Renders one page (1-based) at `dpi` and encodes it (JPEG on white) */
  static async renderPage(pdf: PDFDocumentProxy, pageNumber: number, dpi: number, type: string, quality = 0.92) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: dpi / 72 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    page.cleanup();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(result => (result ? resolve(result) : reject(new Error('Encode failed'))), type, quality));
    return { blob, size: { width: canvas.width, height: canvas.height } };
  }

  /** PNG copy of a non-JPEG image (pdf-lib embeds only JPEG / PNG) */
  private static async toPng(image: PdfImageInput): Promise<Blob> {
    if (image.file.type === 'image/png') return image.file;
    const bitmap = await ImageResizeUtils.load(image.file);
    try {
      return await ImageResizeUtils.resize(bitmap, image.size, 'image/png');
    } finally {
      bitmap.close();
    }
  }
}
