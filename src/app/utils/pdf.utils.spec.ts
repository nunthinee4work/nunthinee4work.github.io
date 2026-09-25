import { PdfUtils } from './pdf.utils';

describe('PdfUtils', () => {
  it('should parse page ranges', () => {
    expect(PdfUtils.parsePageRange('', 3)).toEqual([1, 2, 3]);
    expect(PdfUtils.parsePageRange('1-3, 5', 10)).toEqual([1, 2, 3, 5]);
    expect(PdfUtils.parsePageRange('8-', 10)).toEqual([8, 9, 10]);
    expect(PdfUtils.parsePageRange('-2', 10)).toEqual([1, 2]);
    expect(PdfUtils.parsePageRange('3-1, 2, 99', 5)).toEqual([1, 2, 3]);
    expect(PdfUtils.parsePageRange('abc', 5)).toBeNull();
  });

  it('should size a "fit" page to the image plus margin', () => {
    expect(PdfUtils.layout({ width: 800, height: 600 }, 'fit', 'auto', 20))
      .toEqual({ pageWidth: 840, pageHeight: 640, x: 20, y: 20, width: 800, height: 600 });
  });

  it('should scale down and centre on A4, landscape for wide images in auto', () => {
    const place = PdfUtils.layout({ width: 2000, height: 1000 }, 'a4', 'auto', 0);
    expect(place.pageWidth).toBeCloseTo(841.89);
    expect(place.width).toBeCloseTo(841.89);
    expect(place.height).toBeCloseTo(420.945);
    expect(place.y).toBeCloseTo((595.28 - 420.945) / 2);
  });

  it('should not enlarge a small image on the page', () => {
    const place = PdfUtils.layout({ width: 100, height: 50 }, 'letter', 'portrait', 40);
    expect([place.pageWidth, place.pageHeight, place.width, place.height]).toEqual([612, 792, 100, 50]);
  });

  it('should build a PDF from images and read it back', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 40;
    canvas.getContext('2d')!.fillRect(0, 0, 60, 40);
    const png = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
    const jpg = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg'));

    const pdf = await PdfUtils.imagesToPdf(
      [{ file: png, size: { width: 60, height: 40 } }, { file: jpg, size: { width: 60, height: 40 } }], 'fit', 'auto', 0);
    expect(pdf.type).toBe('application/pdf');

    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(await pdf.arrayBuffer());
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 60, height: 40 });
  });
});
