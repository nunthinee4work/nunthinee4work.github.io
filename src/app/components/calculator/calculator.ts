import { Clipboard } from '@angular/cdk/clipboard';
import { Component, DestroyRef, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CalcLine, CalcUtils } from '../../utils/calc.utils';

/**
 * Numi-style notepad calculator: type one calculation per line, results line up on the right,
 * total at the bottom. The notepad is kept in localStorage (it's a scratchpad, like Numi).
 */
@Component({
  selector: 'app-calculator',
  imports: [ReactiveFormsModule],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
})
export class Calculator {
  /** Rendered inside the Calculator toolkit's tabs: the page already has a heading */
  @Input() embedded = false;

  private static readonly STORAGE_KEY = 'calculator.text';
  private static readonly GUIDE_KEY = 'calculator.guide';
  private static readonly DECIMALS_KEY = 'calculator.decimals';
  static readonly MAX_DECIMALS = 10;
  private static readonly EXAMPLE = [
    '# ตัวอย่าง — ลบทิ้งแล้วพิมพ์ของตัวเองได้เลย',
    '100 + 100 / 100',
    'ค่าส่ง = 50',
    'ค่าส่ง * 3 // ส่ง 3 รอบ',
    '1,070 - 7%',
    '20% of 350',
    'sum',
  ].join('\n');

  private readonly clipboard = inject(Clipboard);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('editor') editor?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('backdrop') backdrop?: ElementRef<HTMLElement>;
  @ViewChild('results') results?: ElementRef<HTMLElement>;

  text = Calculator.readText();
  /** Source lines + their evaluation, rendered in the highlight layer and the result column */
  rows: { code: string; comment: string; line: CalcLine; display: string }[] = [];
  total = 0;
  /** Decimal places each line is rounded to (null = full precision) */
  precision: number | null = null;
  /** Decimal places shown (null = auto, no trailing zeros) */
  displayDecimals: number | null = null;

  readonly maxDecimals = Calculator.MAX_DECIMALS;
  /** Blank = no rounding / auto display */
  decimalsForm = this.fb.nonNullable.group({ precision: [''], display: [''] });

  /**
   * "ทำอะไรได้บ้าง" reference. `example` is real notepad text: results are computed by CalcUtils
   * at runtime, so the guide can't drift from what the parser does.
   */
  readonly guide: { group: string; items: { syntax: string; description: string; example: string }[] }[] = [
    {
      group: 'คำนวณพื้นฐาน',
      items: [
        { syntax: '+  -  *  /', description: 'บวก ลบ คูณ หาร (คูณ/หาร ก่อน บวก/ลบ)', example: '100 + 100 / 100' },
        { syntax: '×  ÷', description: 'ใช้เครื่องหมายคูณ/หารแบบนี้ก็ได้', example: '7 × 6 ÷ 2' },
        { syntax: '( )', description: 'วงเล็บ คำนวณข้างในก่อน', example: '(100 + 100) / 100' },
        { syntax: '^', description: 'ยกกำลัง', example: '2 ^ 10' },
        { syntax: 'mod', description: 'เศษจากการหาร', example: '10 mod 4' },
        { syntax: '1,000.50', description: 'ใส่คอมมาคั่นหลักพัน / ทศนิยมได้', example: '1,070.50 + 0.5' },
      ],
    },
    {
      group: 'เปอร์เซ็นต์',
      items: [
        { syntax: 'a + x%', description: 'บวกเพิ่ม x% ของ a (เช่น บวก VAT)', example: '1,000 + 7%' },
        { syntax: 'a - x%', description: 'ลด x% ของ a (เช่น ส่วนลด)', example: '1,070 - 10%' },
        { syntax: 'x% of a', description: 'x% ของ a', example: '20% of 350' },
        { syntax: 'a * x%', description: 'คูณด้วยเปอร์เซ็นต์', example: '200 * 15%' },
      ],
    },
    {
      group: 'ตัวแปรและบรรทัดก่อนหน้า',
      items: [
        { syntax: 'ชื่อ = ค่า', description: 'ตั้งตัวแปร (ชื่อไทยได้) แล้วใช้ในบรรทัดต่อไป', example: 'ค่าส่ง = 50\nค่าส่ง * 3' },
        { syntax: 'ป้าย: ค่า', description: 'ข้อความก่อน : เป็นแค่ป้ายกำกับ ไม่นำมาคำนวณ', example: 'ค่าของ: 250' },
        { syntax: 'prev', description: 'ผลของบรรทัดก่อนหน้า', example: '120\nprev / 4' },
        { syntax: 'sum  total', description: 'รวมผลบรรทัดข้างบน (จนถึงบรรทัดว่างหรือหัวข้อ) — ไม่นับซ้ำใน Total', example: '10\n20\nsum' },
        { syntax: 'avg  average', description: 'ค่าเฉลี่ยของบรรทัดข้างบน (จนถึงบรรทัดว่างหรือหัวข้อ)', example: '10\n20\navg' },
      ],
    },
    {
      group: 'ฟังก์ชันและค่าคงที่',
      items: [
        { syntax: 'sqrt( )', description: 'รากที่สอง', example: 'sqrt(144)' },
        { syntax: 'round( )  floor( )  ceil( )', description: 'ปัดเศษ / ปัดลง / ปัดขึ้น', example: 'round(2.5)' },
        { syntax: 'abs( )', description: 'ค่าสัมบูรณ์', example: 'abs(-42)' },
        { syntax: 'pi  e', description: 'ค่าคงที่ π และ e', example: 'pi * 2 ^ 2' },
      ],
    },
    {
      group: 'จัดหน้า',
      items: [
        { syntax: '# หัวข้อ', description: 'หัวข้อ (สีส้ม) เริ่มกลุ่มใหม่ของ sum / avg', example: '# RC0001' },
        { syntax: '// หมายเหตุ', description: 'หมายเหตุ ไม่นำมาคำนวณ ใส่ท้ายบรรทัดก็ได้', example: '3 * 150 // 3 กล่อง' },
        { syntax: 'บรรทัดว่าง', description: 'แยกกลุ่มของ sum / avg', example: '' },
      ],
    },
  ];
  showGuide = Calculator.readGuideOpen();

  /** Result shown next to an example (last line of it), '' when it has none */
  exampleResult(example: string): string {
    const lines = CalcUtils.evaluate(example);
    const last = lines[lines.length - 1];
    return last?.kind === 'value' ? CalcUtils.format(last.value!) : '';
  }

  /** "ลอง": append the example to the notepad (after a blank line so it gets its own sum / avg block) */
  tryExample(example: string) {
    const joined = this.text.trim() ? `${this.text.replace(/\n+$/, '')}\n\n${example}` : example;
    this.onInput({ target: { value: joined } } as unknown as Event);
    const editor = this.editor?.nativeElement;
    if (editor) {
      editor.value = joined;
      editor.focus();
      editor.scrollTop = editor.scrollHeight;
      this.onScroll();
    }
  }

  toggleGuide() {
    this.showGuide = !this.showGuide;
    try {
      localStorage.setItem(Calculator.GUIDE_KEY, String(this.showGuide));
    } catch {
      // storage unavailable — the guide state just won't be remembered
    }
  }

  constructor() {
    ({ precision: this.precision, display: this.displayDecimals } = Calculator.readDecimals());
    this.decimalsForm.setValue({ precision: String(this.precision ?? ''), display: String(this.displayDecimals ?? '') });
    this.decimalsForm.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(({ precision, display }) =>
      this.setDecimals(Calculator.parseDecimals(precision), Calculator.parseDecimals(display)));
    this.update();
  }

  onInput(event: Event) {
    this.text = (event.target as HTMLTextAreaElement).value;
    this.update();
    try {
      localStorage.setItem(Calculator.STORAGE_KEY, this.text);
    } catch {
      // storage unavailable — the notepad just won't be kept
    }
  }

  /** Keep the highlight layer and result column aligned with the textarea */
  onScroll() {
    const editor = this.editor?.nativeElement;
    if (!editor) return;
    if (this.backdrop) {
      this.backdrop.nativeElement.scrollTop = editor.scrollTop;
      this.backdrop.nativeElement.scrollLeft = editor.scrollLeft;
    }
    if (this.results) this.results.nativeElement.scrollTop = editor.scrollTop;
  }

  copy(value: number) {
    const text = CalcUtils.plain(value, this.displayDecimals);
    this.clipboard.copy(text);
    this.toastr.success(`คัดลอก ${text} แล้ว`, '', { timeOut: 1500 });
  }

  clear() {
    this.onInput({ target: { value: '' } } as unknown as Event);
    this.editor?.nativeElement.focus();
  }

  /** Decimal settings; null = no rounding / auto display */
  private setDecimals(precision: number | null, display: number | null) {
    this.precision = precision;
    this.displayDecimals = display;
    this.update();
    try {
      localStorage.setItem(Calculator.DECIMALS_KEY, JSON.stringify({ precision: this.precision, display: this.displayDecimals }));
    } catch {
      // storage unavailable — the settings just won't be kept
    }
  }

  formatValue(value: number) {
    return CalcUtils.format(value, this.displayDecimals);
  }

  private update() {
    const lines = CalcUtils.evaluate(this.text, { precision: this.precision });
    this.rows = this.text.split('\n').map((text, index) => ({
      code: CalcUtils.splitComment(text)[0],
      comment: CalcUtils.splitComment(text)[1],
      line: lines[index],
      display: lines[index].kind === 'value' ? CalcUtils.format(lines[index].value!, this.displayDecimals) : '',
    }));
    this.total = CalcUtils.total(lines);
  }

  /** "2" -> 2, "" / junk -> null, clamped to 0…MAX_DECIMALS */
  private static parseDecimals(raw: string | number | null | undefined): number | null {
    const text = String(raw ?? '').trim();
    const value = Number(text);
    if (!text || !Number.isFinite(value)) return null;
    return Math.min(Calculator.MAX_DECIMALS, Math.max(0, Math.round(value)));
  }

  private static readDecimals(): { precision: number | null; display: number | null } {
    const valid = (value: unknown) =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= Calculator.MAX_DECIMALS ? value : null;
    try {
      const saved = JSON.parse(localStorage.getItem(Calculator.DECIMALS_KEY) ?? '{}');
      return { precision: valid(saved?.precision), display: valid(saved?.display) };
    } catch {
      return { precision: null, display: null };
    }
  }

  /** Guide starts open until the user closes it once */
  private static readGuideOpen(): boolean {
    try {
      return localStorage.getItem(Calculator.GUIDE_KEY) !== 'false';
    } catch {
      return true;
    }
  }

  private static readText(): string {
    try {
      return localStorage.getItem(Calculator.STORAGE_KEY) ?? Calculator.EXAMPLE;
    } catch {
      return Calculator.EXAMPLE;
    }
  }
}
