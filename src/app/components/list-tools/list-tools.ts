import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { DownloadButton } from '../../shared/download-button/download-button';
import { CountFormat, CountResult, CountSort, DEFAULT_LIST_OPTIONS, ListOptions, ListResult, ListUtils } from '../../utils/list.utils';

/**
 * Former Array Formatter + Thai Locale Compare: split, clean, sort (Thai-aware), quote and join a list.
 * Second tab counts duplicate lines (somacon.com "Count Duplicates in a List"). Both tabs share the input.
 */
@Component({
  selector: 'app-list-tools',
  imports: [ReactiveFormsModule, CopyButton, DownloadButton],
  templateUrl: './list-tools.html',
  styleUrl: './list-tools.scss',
})
export class ListTools implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly SECTION_KEY = 'listFormatter.section';

  readonly sections = [
    { id: 'format', label: 'Format', icon: 'fa-list-check' },
    { id: 'count', label: 'Count Duplicates', icon: 'fa-layer-group' },
  ] as const;

  section: 'format' | 'count' = ListTools.readSection();

  form = this.fb.nonNullable.group({
    text: [''],
    ...Object.fromEntries(Object.entries(DEFAULT_LIST_OPTIONS).map(([key, value]) => [key, [value]])),
    countSort: ['COUNT'],
    countFormat: ['TEXT'],
    includeCounts: [true],
    duplicatesOnly: [false],
    countIgnoreCase: [false],
  } as Record<'text' | keyof ListOptions | 'countSort' | 'countFormat' | 'includeCounts' | 'duplicatesOnly' | 'countIgnoreCase', unknown[]>);

  result: ListResult = ListUtils.process('');
  counts: CountResult = ListUtils.countDuplicates('');
  countOutput = '';
  /** Last cleared input, kept in memory only (never stored) for "Restore input" */
  lastCleared = '';

  readonly sortOptions = [
    { value: 'NONE', label: 'ไม่เรียง', icon: 'fa-minus', title: 'Keep the original order' },
    { value: 'ASC', label: 'A → Z · ก → ฮ', icon: 'fa-arrow-down-short-wide', title: 'English first, then Thai' },
    { value: 'DESC', label: 'Z → A · ฮ → ก', icon: 'fa-arrow-down-wide-short', title: 'Reverse order' },
  ];

  ngOnInit() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.update());
  }

  get countExtension() {
    const format = this.form.getRawValue()['countFormat'] as CountFormat;
    return format === 'CSV' ? 'csv' : format === 'TAB' ? 'tsv' : 'txt';
  }

  get countMime() {
    const format = this.form.getRawValue()['countFormat'] as CountFormat;
    return format === 'CSV' ? 'text/csv' : format === 'TAB' ? 'text/tab-separated-values' : 'text/plain';
  }

  setSection(section: 'format' | 'count') {
    this.section = section;
    try {
      localStorage.setItem(ListTools.SECTION_KEY, section);
    } catch {
      // storage unavailable — the tab just won't be remembered
    }
  }

  clear() {
    const text = this.form.getRawValue()['text'] as string;
    if (text) this.lastCleared = text;
    this.form.reset();
  }

  restore() {
    this.form.patchValue({ text: this.lastCleared });
    this.lastCleared = '';
  }

  /** Reuse the output as the next input (e.g. sort, then format differently) */
  useOutput() {
    this.form.patchValue({ text: this.result.output });
  }

  private update() {
    // valueChanges also fires for reset/patchValue, which zoneless CD doesn't see on its own
    this.cdr.markForCheck();
    const { text, countSort, countFormat, includeCounts, duplicatesOnly, countIgnoreCase, ...options } =
      this.form.getRawValue() as { text: string; countSort: CountSort; countFormat: CountFormat; includeCounts: boolean; duplicatesOnly: boolean; countIgnoreCase: boolean } & ListOptions;
    this.result = ListUtils.process(text ?? '', options);
    this.counts = ListUtils.countDuplicates(text ?? '', {
      sort: countSort,
      // Radio buttons may hand back the string "true"
      duplicatesOnly: String(duplicatesOnly) === 'true',
      trim: options.trim,
      ignoreCase: countIgnoreCase,
    });
    this.countOutput = ListUtils.formatCounts(this.counts.rows, countFormat, includeCounts);
  }

  private static readSection(): 'format' | 'count' {
    try {
      return localStorage.getItem(ListTools.SECTION_KEY) === 'count' ? 'count' : 'format';
    } catch {
      return 'format';
    }
  }
}
