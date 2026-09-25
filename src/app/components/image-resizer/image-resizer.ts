import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { FileUtils } from '../../utils/file.utils';
import { ImageResizeUtils, ImageSize } from '../../utils/image-resize.utils';

interface ResizedImage {
  blob: Blob;
  url: string;
  size: ImageSize;
  name: string;
}

interface ImageItem {
  id: number;
  file: File;
  /** Object URL of the original, for the thumbnail */
  url: string;
  bitmap: ImageBitmap;
  size: ImageSize;
  /** Own Width / Height for this image; unset = the "All images" values in the side panel */
  custom?: { width: number | null; height: number | null };
  /** Own 🔗 lock; unset = the panel's "Maintain aspect ratio" */
  keepRatio?: boolean;
  result?: ResizedImage;
  error?: string;
}

/**
 * iloveimg.com-style "Resize image by pixels" + format conversion: pick / drop / paste images, set width /
 * height and output format (JPG / PNG / WEBP), convert in the browser (canvas) and download. Images never leave the page and are not persisted.
 */
@Component({
  selector: 'app-image-resizer',
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './image-resizer.html',
  styleUrl: './image-resizer.scss',
})
export class ImageResizer {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);

  form = this.fb.group({
    width: [null as number | null],
    height: [null as number | null],
    keepAspectRatio: [true],
    noEnlarge: [true],
    /** '' = keep each file's own format */
    format: [''],
    /** JPG quality, 10–100 */
    quality: [92],
  });

  readonly formats = [
    { value: '', label: 'Original' },
    { value: 'image/jpeg', label: 'JPG' },
    { value: 'image/png', label: 'PNG' },
    { value: 'image/gif', label: 'GIF' },
    { value: 'image/svg+xml', label: 'SVG' },
  ];

  items: ImageItem[] = [];
  /** Image shown in the preview popup (its converted result only) */
  preview: ImageItem | null = null;
  /** Popup at 1:1 instead of fitted */
  actualPixels = false;
  private refreshTimer?: ReturnType<typeof setTimeout>;
  dragging = false;
  busy = false;
  private nextId = 1;

  readonly formatBytes = ImageResizeUtils.formatBytes;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const { width, height } = this.form.controls;
    // Like iloveimg: with the ratio locked, typing one side fills the other from the first image
    width.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(value => this.syncSide('height', value));
    height.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(value => this.syncSide('width', value));
    this.form.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.clearResults());
    destroyRef.onDestroy(() => {
      clearTimeout(this.refreshTimer);
      this.items.forEach(item => this.release(item));
    });
  }

  /** Size each image will get with the current options (shown before resizing) */
  targetSize(item: ImageItem): ImageSize {
    const { width, height } = this.enteredSize(item);
    return ImageResizeUtils.targetSize(item.size, {
      width,
      height,
      keepAspectRatio: this.keepsRatio(item),
      noEnlarge: !!this.form.getRawValue().noEnlarge,
    });
  }

  /** What the card's W / H inputs show: the image's own values, else the panel's (blank = auto) */
  enteredSize(item: ImageItem): { width: number | null; height: number | null } {
    if (item.custom) return item.custom;
    const { width, height } = this.form.getRawValue();
    return { width: Number(width) || null, height: Number(height) || null };
  }

  keepsRatio(item: ImageItem): boolean {
    return item.keepRatio ?? !!this.form.getRawValue().keepAspectRatio;
  }

  /** Why the output differs from what was typed (the inputs are never overwritten with it) */
  sizeNote(item: ImageItem): string {
    const entered = this.enteredSize(item);
    const target = this.targetSize(item);
    const differs = (entered.width && entered.width !== target.width) || (entered.height && entered.height !== target.height);
    if (!differs) return '';
    const unclamped = ImageResizeUtils.targetSize(item.size, { ...entered, keepAspectRatio: this.keepsRatio(item), noEnlarge: false });
    return unclamped.width > item.size.width || unclamped.height > item.size.height
      ? 'ไม่ขยายเกินต้นฉบับ' : 'ย่อให้พอดีกรอบ คงสัดส่วน';
  }

  /** Typing in an image's own W / H: with its ratio locked the other side follows this image's proportions */
  setCustomSize(item: ImageItem, side: 'width' | 'height', raw: string) {
    const value = Number(raw) > 0 ? Math.round(Number(raw)) : null;
    const custom = { ...this.enteredSize(item), [side]: value };
    if (value && this.keepsRatio(item)) {
      const other = side === 'width' ? 'height' : 'width';
      custom[other] = ImageResizeUtils.proportional(item.size, side, value);
    }
    item.custom = custom;
    this.sizeChanged(item);
  }

  /** 🔗 on a card: lock / unlock this image's proportions (re-locking derives H from W) */
  toggleKeepRatio(item: ImageItem) {
    item.keepRatio = !this.keepsRatio(item);
    const entered = this.enteredSize(item);
    if (item.keepRatio && entered.width) {
      item.custom = { width: entered.width, height: ImageResizeUtils.proportional(item.size, 'width', entered.width) };
    }
    this.sizeChanged(item);
  }

  resetCustomSize(item: ImageItem) {
    item.custom = undefined;
    item.keepRatio = undefined;
    this.sizeChanged(item);
  }

  isCustom(item: ImageItem) {
    return !!item.custom || item.keepRatio !== undefined;
  }

  get customCount() {
    return this.items.filter(item => this.isCustom(item)).length;
  }

  outputType(item: ImageItem) {
    return ImageResizeUtils.outputType(item.file.type, this.form.getRawValue().format ?? '');
  }

  /** Quality applies to lossy output only */
  get usesQuality() {
    const format = this.form.getRawValue().format;
    return format ? format === 'image/jpeg' : this.items.some(item => this.outputType(item) === 'image/jpeg');
  }

  setFormat(value: string) {
    this.form.controls.format.setValue(value);
  }

  formatLabel(type: string) {
    return ImageResizeUtils.label(type);
  }

  get resultCount() {
    return this.items.filter(item => item.result).length;
  }

  get hasResults() {
    return this.items.some(item => item.result);
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
    const files = [...(event.clipboardData?.files ?? [])].filter(file => file.type.startsWith('image/'));
    if (files.length) this.addFiles(files);
  }

  async addFiles(files: FileList | File[] | null | undefined) {
    const images = [...(files ?? [])].filter(file => file.type.startsWith('image/'));
    if (files?.length && !images.length) {
      this.toastr.error('รองรับเฉพาะไฟล์รูปภาพ', 'แจ้งเตือน');
      return;
    }
    for (const file of images) {
      try {
        const bitmap = await ImageResizeUtils.load(file);
        this.items.push({
          id: this.nextId++,
          file,
          url: URL.createObjectURL(file),
          bitmap,
          size: { width: bitmap.width, height: bitmap.height },
        });
      } catch {
        this.toastr.error(`เปิดไฟล์ ${file.name} ไม่ได้`, 'แจ้งเตือน');
      }
    }
    // Start from the first image's real size (like iloveimg) when nothing is typed yet
    const first = this.items[0];
    if (first && !this.form.value.width && !this.form.value.height) {
      this.form.patchValue({ width: first.size.width, height: first.size.height }, { emitEvent: false });
    }
    this.clearResults();
    this.cdr.markForCheck();
  }

  remove(item: ImageItem) {
    if (this.preview === item) this.preview = null;
    this.release(item);
    this.items = this.items.filter(other => other !== item);
    if (!this.items.length) this.form.patchValue({ width: null, height: null }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  clear() {
    this.preview = null;
    this.items.forEach(item => this.release(item));
    this.items = [];
    this.form.patchValue({ width: null, height: null }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  async resizeAll() {
    if (!this.items.length) {
      this.toastr.error('เลือกรูปก่อน', 'แจ้งเตือน');
      return;
    }
    this.busy = true;
    this.clearResults();
    this.cdr.markForCheck();
    for (const item of this.items) await this.convert(item);
    this.busy = false;
    this.cdr.markForCheck();
  }

  /** Preview popup; converts this image with the current options first when needed */
  async openPreview(item: ImageItem) {
    if (!item.result) await this.convert(item);
    if (item.result) this.preview = item;
    this.cdr.markForCheck();
  }

  /** Size edits inside the popup re-render the image live (old one stays until the new is ready) */
  private sizeChanged(item: ImageItem) {
    if (this.preview !== item) {
      this.clearResult(item);
      return;
    }
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(async () => {
      await this.convert(item);
      this.cdr.markForCheck();
    }, 250);
  }

  closePreview() {
    this.preview = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closePreview();
  }

  download(item: ImageItem) {
    if (item.result) FileUtils.downloadBlob(item.result.blob, item.result.name);
  }

  downloadAll() {
    this.items.forEach(item => this.download(item));
  }

  private async convert(item: ImageItem) {
    const size = this.targetSize(item);
    const type = this.outputType(item);
    const { quality } = this.form.getRawValue();
    try {
      const blob = item.file.type === ImageResizeUtils.SVG && type === ImageResizeUtils.SVG
        ? await ImageResizeUtils.resizeSvg(item.file, item.size, size, !this.keepsRatio(item))
        : await ImageResizeUtils.resize(item.bitmap, size, type, Math.min(100, Math.max(10, Number(quality) || 92)) / 100);
      // toBlob falls back to PNG for a type the browser can't encode: name the file after what we got
      const name = ImageResizeUtils.outputName(item.file.name, size, blob.type || type);
      if (item.result) URL.revokeObjectURL(item.result.url);
      item.result = { blob, url: URL.createObjectURL(blob), size, name };
      item.error = blob.type && blob.type !== type ? `Browser นี้แปลงเป็น ${this.formatLabel(type)} ไม่ได้ ได้ ${this.formatLabel(blob.type)} แทน` : undefined;
    } catch {
      item.error = 'แปลงไฟล์ไม่สำเร็จ';
    }
  }

  private syncSide(side: 'width' | 'height', otherValue: number | null) {
    const first = this.items[0];
    const value = Number(otherValue);
    if (!first || !this.form.value.keepAspectRatio || !(value > 0)) return;
    const other = side === 'height' ? 'width' : 'height';
    this.form.controls[side].setValue(ImageResizeUtils.proportional(first.size, other, value), { emitEvent: false });
  }

  private clearResults() {
    this.items.forEach(item => this.clearResult(item));
  }

  private clearResult(item: ImageItem) {
    if (this.preview === item) this.preview = null;
    if (item.result) URL.revokeObjectURL(item.result.url);
    item.result = undefined;
    item.error = undefined;
  }

  private release(item: ImageItem) {
    URL.revokeObjectURL(item.url);
    if (item.result) URL.revokeObjectURL(item.result.url);
    item.bitmap.close();
  }
}
