import { ChangeDetectorRef, Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DiffPart, DiffResult, DiffRow, DiffSide, DiffUtils } from '../../utils/diff.utils';
import { JsonUtils } from '../../utils/json.utils';

/** A run of unchanged lines hidden behind an "N unchanged lines" bar. */
interface FoldRow {
  type: 'fold';
  id: number;
  rows: DiffRow[];
}

type DisplayRow = DiffRow | FoldRow;

@Component({
  selector: 'app-text-compare',
  imports: [ReactiveFormsModule],
  templateUrl: './text-compare.html',
  styleUrl: './text-compare.scss',
})
export class TextCompare {
  /** Rendered inside Text Toolkit's tabs: the page already has a heading */
  @Input() embedded = false;

  /** Unchanged lines kept visible around each change */
  static readonly CONTEXT = 3;

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  form = this.fb.nonNullable.group({
    left: [''],
    right: [''],
    ignoreWhitespace: [false],
    ignoreCase: [false],
    realtime: [true],
    collapse: [true],
    sortKeys: [false],
  });

  /** Per-side error from the last Format JSON attempt */
  jsonErrors: { left: string | null; right: string | null } = { left: null, right: null };

  view: 'split' | 'unified' = 'split';
  result: DiffResult | null = null;
  displayRows: DisplayRow[] = [];
  private expandedFolds = new Set<number>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const { left, right, realtime, ignoreWhitespace, ignoreCase, collapse } = this.form.controls;

    // Text edits re-run the diff only in real-time mode...
    merge(left.valueChanges, right.valueChanges, realtime.valueChanges)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => { if (realtime.value) this.compare(); });

    // ...while option changes always refresh a result that is already on screen
    merge(ignoreWhitespace.valueChanges, ignoreCase.valueChanges, collapse.valueChanges)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => { if (this.result) this.compare(); });
  }

  compare() {
    // compare() also runs from valueChanges (e.g. programmatic patchValue), which zoneless CD doesn't see
    this.cdr.markForCheck();
    const { left, right, ignoreWhitespace, ignoreCase } = this.form.getRawValue();
    if (!left && !right) {
      this.result = null;
      this.displayRows = [];
      return;
    }
    this.result = DiffUtils.compareText(left, right, { ignoreWhitespace, ignoreCase });
    this.expandedFolds.clear();
    this.buildDisplayRows();
  }

  swap() {
    const { left, right } = this.form.getRawValue();
    this.form.patchValue({ left: right, right: left });
    if (!this.form.getRawValue().realtime && this.result) this.compare();
  }

  clear() {
    this.cdr.markForCheck();
    this.jsonErrors = { left: null, right: null };
    this.form.patchValue({ left: '', right: '' });
    this.result = null;
    this.displayRows = [];
  }

  /** Pretty-print one side (or both) as JSON; invalid sides keep their text and show the error. */
  formatJson(side: 'left' | 'right' | 'both' = 'both') {
    const sides: ('left' | 'right')[] = side === 'both' ? ['left', 'right'] : [side];
    const { sortKeys } = this.form.getRawValue();
    const patch: Partial<{ left: string; right: string }> = {};

    for (const key of sides) {
      const text = this.form.controls[key].value;
      this.jsonErrors[key] = null;
      if (!text.trim()) continue;
      try {
        patch[key] = JsonUtils.format(text, { sortKeys });
      } catch {
        const { line, column } = JsonUtils.validate(JsonUtils.normalizeMongoShell(text));
        this.jsonErrors[key] = line ? `Invalid JSON at line ${line}, column ${column}` : 'Invalid JSON';
      }
    }

    this.form.patchValue(patch);
    if (!this.form.getRawValue().realtime && this.result) this.compare();
  }

  /** Details for the "no differences" card. */
  get identicalInfo() {
    const { left, right, ignoreWhitespace, ignoreCase } = this.form.getRawValue();
    const normalize = (text: string) => text.replace(/\r\n?/g, '\n');
    const exact = normalize(left) === normalize(right);
    const ignored = [ignoreWhitespace && 'ช่องว่าง', ignoreCase && 'ตัวพิมพ์เล็ก/ใหญ่'].filter(Boolean) as string[];
    return {
      exact,
      lines: DiffUtils.splitLines(left).length,
      chars: normalize(left).length,
      ignored: exact ? [] : ignored,
    };
  }

  /** Turn off the ignore options so differences they hide become visible. */
  showAllDifferences() {
    this.form.patchValue({ ignoreWhitespace: false, ignoreCase: false });
  }

  setView(view: 'split' | 'unified') {
    this.view = view;
  }

  expandFold(id: number) {
    this.expandedFolds.add(id);
    this.buildDisplayRows();
  }

  isFold(row: DisplayRow): row is FoldRow {
    return row.type === 'fold';
  }

  /** Word pieces for modified lines, or the whole line as one unchanged piece. */
  partsOf(side: DiffSide): DiffPart[] {
    return side.parts ?? [{ text: side.text, changed: false }];
  }

  asDiff(row: DisplayRow): DiffRow {
    return row as DiffRow;
  }

  get leftLineCount() {
    return DiffUtils.splitLines(this.form.getRawValue().left).length;
  }

  get rightLineCount() {
    return DiffUtils.splitLines(this.form.getRawValue().right).length;
  }

  private buildDisplayRows() {
    const rows = this.result?.rows ?? [];
    if (!this.form.getRawValue().collapse) {
      this.displayRows = rows;
      return;
    }

    const context = TextCompare.CONTEXT;
    const display: DisplayRow[] = [];
    let i = 0;
    let foldId = 0;
    while (i < rows.length) {
      if (rows[i].type !== 'equal') {
        display.push(rows[i++]);
        continue;
      }
      let end = i;
      while (end < rows.length && rows[end].type === 'equal') end++;
      const run = rows.slice(i, end);
      const keepBefore = i === 0 ? 0 : context;
      const keepAfter = end === rows.length ? 0 : context;
      const id = foldId++;

      if (run.length > keepBefore + keepAfter + 1 && !this.expandedFolds.has(id)) {
        display.push(...run.slice(0, keepBefore));
        display.push({ type: 'fold', id, rows: run.slice(keepBefore, run.length - keepAfter) });
        display.push(...run.slice(run.length - keepAfter));
      } else {
        display.push(...run);
      }
      i = end;
    }
    this.displayRows = display;
  }
}
