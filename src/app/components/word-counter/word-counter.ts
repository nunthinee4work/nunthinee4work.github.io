import { ChangeDetectorRef, Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { KeywordCount, TextStats, TextStatsUtils } from '../../utils/text-stats.utils';

@Component({
  selector: 'app-word-counter',
  imports: [ReactiveFormsModule, CopyButton],
  templateUrl: './word-counter.html',
  styleUrl: './word-counter.scss',
})
export class WordCounter {
  /** Rendered inside Text Toolkit's tabs: the page already has a heading */
  @Input() embedded = false;

  /** Field limits the team hits most often */
  readonly limitPresets = [25, 50, 100, 255];

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  form = this.fb.nonNullable.group({
    text: [''],
    limit: [null as number | null],
    phraseLength: [1],
    excludeStopWords: [true],
  });

  stats: TextStats = TextStatsUtils.analyze('');
  keywords: KeywordCount[] = [];

  readonly formatDuration = TextStatsUtils.formatDuration;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.update());
  }

  get limit() {
    const limit = Number(this.form.getRawValue().limit);
    return limit > 0 ? limit : null;
  }

  get limitPercent() {
    return this.limit ? Math.min(100, (this.stats.characters / this.limit) * 100) : 0;
  }

  get remaining() {
    return this.limit ? this.limit - this.stats.characters : 0;
  }

  setLimit(limit: number | null) {
    this.form.patchValue({ limit });
  }

  clear() {
    this.form.patchValue({ text: '' });
  }

  private update() {
    // valueChanges can come from patchValue (preset buttons), which zoneless CD doesn't see on its own
    this.cdr.markForCheck();
    const { text, phraseLength, excludeStopWords } = this.form.getRawValue();
    this.stats = TextStatsUtils.analyze(text);
    this.keywords = TextStatsUtils.keywords(text, phraseLength, { excludeStopWords, limit: 10 });
  }
}
