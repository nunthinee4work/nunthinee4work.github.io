import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { JsonUtils, JsonValidationResult } from '../../utils/json.utils';

/**
 * Textarea for pasting JSON with line numbers, live validation, an error-line highlight,
 * "Go to line" and "Format". Works with `formControlName` (ControlValueAccessor).
 */
@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => JsonEditor), multi: true }],
  host: { '[class.is-invalid]': 'invalid' },
})
export class JsonEditor implements ControlValueAccessor {
  /** Accept `{...}`, `{...},{...}`, `[{...}]` and mongo-shell helpers, and show an object count. */
  @Input() list = false;
  /** Noun used with the count, e.g. "delivery order" -> "3 delivery orders". */
  @Input() itemLabel = 'object';
  @Input() placeholder = 'Paste JSON here';
  @Input() invalid = false;
  /** CSS height of the text area, e.g. `220px` or `calc(100vh - 300px)`. */
  @Input() height = '220px';
  /** Fires after the form control has been updated (typing, paste or Format). */
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('textarea', { static: true }) textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('gutter', { static: true }) gutterRef!: ElementRef<HTMLElement>;
  @ViewChild('highlight', { static: true }) highlightRef!: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);

  value = '';
  lineNumbers: number[] = [1];
  result: JsonValidationResult | null = null;
  cursor = { line: 1, column: 1 };
  disabled = false;

  // Must match the textarea's CSS (see .json-editor in styles.scss)
  readonly lineHeight = 21;
  readonly paddingTop = 10;
  readonly paddingLeft = 12;
  private charWidth = 0;

  private onChange: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.textareaRef.nativeElement.value = this.value;
    this.refresh();
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  onInput() {
    this.setValue(this.textareaRef.nativeElement.value);
  }

  onBlur() {
    this.onTouched();
  }

  updateCursor() {
    const textarea = this.textareaRef.nativeElement;
    const before = textarea.value.slice(0, textarea.selectionStart).split('\n');
    this.cursor = { line: before.length, column: before[before.length - 1].length + 1 };
  }

  /** Keeps gutter and error highlight aligned with the textarea's scroll position. */
  syncScroll() {
    const textarea = this.textareaRef.nativeElement;
    this.gutterRef.nativeElement.scrollTop = textarea.scrollTop;
    this.highlightRef.nativeElement.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
  }

  get errorTop() {
    return this.paddingTop + ((this.result?.line ?? 1) - 1) * this.lineHeight;
  }

  get errorMarkerLeft() {
    return this.paddingLeft + ((this.result?.column ?? 1) - 1) * this.measureCharWidth();
  }

  get markerWidth() {
    return Math.max(this.measureCharWidth(), 8);
  }

  get statusMessage() {
    // Engine messages repeat the position (sometimes of the wrapped text) — we show our own
    return (this.result?.message ?? '')
      .replace(/\s*(in JSON )?at position \d+.*$/, '')
      .replace(/,\s*".*" is not valid JSON$/s, '');
  }

  gotoError() {
    if (!this.result || this.result.valid || !this.result.line) return;
    const textarea = this.textareaRef.nativeElement;
    const lines = textarea.value.split('\n');
    const lineStart = lines.slice(0, this.result.line - 1).reduce((sum, line) => sum + line.length + 1, 0);
    const position = Math.min(lineStart + (this.result.column ?? 1) - 1, textarea.value.length);

    textarea.focus();
    textarea.setSelectionRange(position, Math.min(position + 1, textarea.value.length));
    // Leave a few lines of context above the error
    textarea.scrollTop = Math.max(0, (this.result.line - 4) * this.lineHeight);
    this.syncScroll();
    this.updateCursor();
  }

  format() {
    this.rewrite(2);
  }

  minify() {
    this.rewrite(0);
  }

  /** Selects `start..end` in the text, scrolls it into view and focuses the editor. */
  select(start: number, end: number) {
    const textarea = this.textareaRef.nativeElement;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    const line = textarea.value.slice(0, start).split('\n').length;
    textarea.scrollTop = Math.max(0, (line - 4) * this.lineHeight);
    this.syncScroll();
    this.updateCursor();
  }

  private rewrite(indent: number) {
    if (!this.result?.valid) return;
    const trimmed = this.value.trim();
    const separator = indent ? ',\n' : ',';
    let formatted: string;
    if (this.list) {
      const objects = JsonUtils.parseObjectList(this.value);
      formatted = trimmed.startsWith('[')
        ? JSON.stringify(objects, null, indent)
        : objects.map(object => JSON.stringify(object, null, indent)).join(separator);
    } else {
      formatted = JSON.stringify(JSON.parse(JsonUtils.normalizeMongoShell(this.value)), null, indent);
    }
    this.textareaRef.nativeElement.value = formatted;
    this.setValue(formatted);
    this.textareaRef.nativeElement.scrollTop = 0;
    this.syncScroll();
  }

  private setValue(value: string) {
    this.value = value;
    this.refresh();
    this.onChange(value);
    this.valueChange.emit(value);
  }

  private refresh() {
    const lineCount = this.value.split('\n').length;
    if (lineCount !== this.lineNumbers.length) {
      this.lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
    }
    this.result = !this.value.trim()
      ? null
      : this.list ? JsonUtils.validateObjectList(this.value) : JsonUtils.validate(JsonUtils.normalizeMongoShell(this.value));
    this.updateCursor();
  }

  private measureCharWidth() {
    if (this.charWidth) return this.charWidth;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return 7.8;
    context.font = getComputedStyle(this.textareaRef.nativeElement).font;
    this.charWidth = context.measureText('x'.repeat(100)).width / 100 || 7.8;
    return this.charWidth;
  }
}
