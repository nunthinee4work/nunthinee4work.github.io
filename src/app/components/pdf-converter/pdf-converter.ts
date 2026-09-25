import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { FileUtils } from '../../utils/file.utils';
import { ImageResizeUtils, ImageSize } from '../../utils/image-resize.utils';
import { OrientationOption, PageSizeOption, PdfUtils } from '../../utils/pdf.utils';

type Section = 'toImage' | 'toPdf';

interface PageImage {
  page: number;
  blob: Blob;
  url: string;
  size: ImageSize;
  name: string;
}

interface PdfSourceImage {
  id: number;
  file: File;
  url: string;
  size: ImageSize;
}

/**
 * iLovePDF-style "PDF to JPG" / "JPG to PDF". pdf.js renders pages, pdf-lib writes the PDF;
 * both are loaded lazily and everything stays in the browser (files are not uploaded or persisted).
 */
@Component({
  selector: 'app-pdf-converter',
  imports: [ReactiveFormsModule],
  templateUrl: './pdf-converter.html',
  styleUrl: './pdf-converter.scss',
})
export class PdfConverter {
  private static readonly SECTION_KEY = 'pdfConverter.section';

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);

  readonly sections: { id: Section; label: string; icon: string }[] = [
    { id: 'toImage', label: 'PDF → Image', icon: 'fa-file-image' },
    { id: 'toPdf', label: 'Image → PDF', icon: 'fa-file-pdf' },
  ];
  section: Section = PdfConverter.readSection();

  readonly dpiPresets = [72, 150, 300];
  readonly imageFormats = [
    { value: 'image/jpeg', label: 'JPG' },
    { value: 'image/png', label: 'PNG' },
  ];
  readonly pageSizes: { value: PageSizeOption; label: string }[] = [
    { value: 'fit', label: 'Fit image' },
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'Letter' },
  ];
  readonly orientations: { value: OrientationOption; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
  ];
  readonly margins = [
    { value: 0, label: 'None' },
    { value: 20, label: 'Small' },
    { value: 40, label: 'Big' },
  ];

  toImageForm = this.fb.nonNullable.group({
    format: ['image/jpeg'],
    dpi: [150],
    quality: [92],
    pages: [''],
  });

  toPdfForm = this.fb.nonNullable.group({
    pageSize: ['a4' as PageSizeOption],
    orientation: ['auto' as OrientationOption],
    margin: [20],
  });

  // PDF -> Image
  pdfFile: File | null = null;
  pageCount = 0;
  pageImages: PageImage[] = [];
  converting = false;
  progress = 0;

  // Image -> PDF
  images: PdfSourceImage[] = [];
  building = false;
  private nextId = 1;

  dragging = false;
  readonly formatBytes = ImageResizeUtils.formatBytes;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clearPageImages();
      this.images.forEach(image => URL.revokeObjectURL(image.url));
    });
  }

  setSection(section: Section) {
    this.section = section;
    try {
      localStorage.setItem(PdfConverter.SECTION_KEY, section);
    } catch {
      // storage unavailable — the tab just won't be remembered
    }
  }

  onFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging = true;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
    this.addFiles(event.dataTransfer?.files);
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const files = [...(event.clipboardData?.files ?? [])];
    if (files.length) this.addFiles(files);
  }

  /** Drop / pick / paste goes to the open section */
  addFiles(files: FileList | File[] | null | undefined) {
    const list = [...(files ?? [])];
    if (!list.length) return;
    if (this.section === 'toImage') {
      const pdf = list.find(file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
      if (pdf) this.openPdf(pdf);
      else this.toastr.error('เลือกไฟล์ PDF', 'แจ้งเตือน');
    } else {
      this.addImages(list);
    }
  }

  // ---- PDF -> Image -------------------------------------------------------

  async openPdf(file: File) {
    this.clearPageImages();
    try {
      const pdf = await PdfUtils.openPdf(await file.arrayBuffer());
      this.pageCount = pdf.numPages;
      this.pdfFile = file;
      await pdf.loadingTask.destroy();
    } catch (error) {
      this.pdfFile = null;
      this.pageCount = 0;
      this.toastr.error((error as Error)?.name === 'PasswordException'
        ? 'PDF นี้ติดรหัสผ่าน ยังไม่รองรับ' : `เปิด ${file.name} ไม่ได้`, 'แจ้งเตือน');
    }
    this.cdr.markForCheck();
  }

  get selectedPages(): number[] | null {
    return PdfUtils.parsePageRange(this.toImageForm.getRawValue().pages, this.pageCount);
  }

  async convertToImages() {
    if (!this.pdfFile) {
      this.toastr.error('เลือกไฟล์ PDF ก่อน', 'แจ้งเตือน');
      return;
    }
    const pages = this.selectedPages;
    if (!pages?.length) {
      this.toastr.error('ช่วงหน้าไม่ถูกต้อง เช่น 1-3, 5', 'แจ้งเตือน');
      return;
    }
    const { format, dpi, quality } = this.toImageForm.getRawValue();
    const safeDpi = Math.min(600, Math.max(36, Number(dpi) || 150));
    this.clearPageImages();
    this.converting = true;
    this.progress = 0;
    this.cdr.markForCheck();
    const base = this.pdfFile.name.replace(/\.pdf$/i, '') || 'page';
    let pdf;
    try {
      pdf = await PdfUtils.openPdf(await this.pdfFile.arrayBuffer());
      for (const page of pages) {
        const { blob, size } = await PdfUtils.renderPage(pdf, page, safeDpi, format, Math.min(100, Math.max(10, quality)) / 100);
        const name = `${base}-page-${String(page).padStart(String(this.pageCount).length, '0')}.${ImageResizeUtils.extension(format)}`;
        this.pageImages.push({ page, blob, url: URL.createObjectURL(blob), size, name });
        this.progress++;
        this.cdr.markForCheck();
      }
    } catch {
      this.toastr.error('แปลง PDF ไม่สำเร็จ', 'แจ้งเตือน');
    } finally {
      await pdf?.loadingTask.destroy();
      this.converting = false;
      this.cdr.markForCheck();
    }
  }

  downloadPage(image: PageImage) {
    FileUtils.downloadBlob(image.blob, image.name);
  }

  downloadAllPages() {
    this.pageImages.forEach(image => this.downloadPage(image));
  }

  clearPdf() {
    this.clearPageImages();
    this.pdfFile = null;
    this.pageCount = 0;
    this.cdr.markForCheck();
  }

  // ---- Image -> PDF -------------------------------------------------------

  async addImages(files: File[]) {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      this.toastr.error('รองรับเฉพาะไฟล์รูปภาพ', 'แจ้งเตือน');
      return;
    }
    for (const file of images) {
      try {
        const bitmap = await ImageResizeUtils.load(file);
        this.images.push({ id: this.nextId++, file, url: URL.createObjectURL(file), size: { width: bitmap.width, height: bitmap.height } });
        bitmap.close();
      } catch {
        this.toastr.error(`เปิดไฟล์ ${file.name} ไม่ได้`, 'แจ้งเตือน');
      }
    }
    this.cdr.markForCheck();
  }

  move(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= this.images.length) return;
    [this.images[index], this.images[target]] = [this.images[target], this.images[index]];
  }

  removeImage(image: PdfSourceImage) {
    URL.revokeObjectURL(image.url);
    this.images = this.images.filter(other => other !== image);
  }

  clearImages() {
    this.images.forEach(image => URL.revokeObjectURL(image.url));
    this.images = [];
  }

  async buildPdf() {
    if (!this.images.length) {
      this.toastr.error('เลือกรูปก่อน', 'แจ้งเตือน');
      return;
    }
    const { pageSize, orientation, margin } = this.toPdfForm.getRawValue();
    this.building = true;
    this.cdr.markForCheck();
    try {
      const pdf = await PdfUtils.imagesToPdf(this.images, pageSize, orientation, Number(margin) || 0);
      const base = this.images.length === 1 ? this.images[0].file.name.replace(/\.[^.]+$/, '') : 'images';
      FileUtils.downloadBlob(pdf, FileUtils.timestampedName(base, 'pdf'));
    } catch {
      this.toastr.error('สร้าง PDF ไม่สำเร็จ', 'แจ้งเตือน');
    } finally {
      this.building = false;
      this.cdr.markForCheck();
    }
  }

  private clearPageImages() {
    this.pageImages.forEach(image => URL.revokeObjectURL(image.url));
    this.pageImages = [];
    this.progress = 0;
  }

  private static readSection(): Section {
    try {
      return localStorage.getItem(PdfConverter.SECTION_KEY) === 'toPdf' ? 'toPdf' : 'toImage';
    } catch {
      return 'toImage';
    }
  }
}
