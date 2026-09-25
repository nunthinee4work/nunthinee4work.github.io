import { ChangeDetectorRef, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { CronError, CronFieldName, CronSchedule as Schedule, CronUtils } from '../../utils/cron.utils';
import { EpochUtils, TimeZoneMode } from '../../utils/epoch.utils';

interface FieldHelp {
  name: CronFieldName;
  label: string;
  allowed: string;
}

@Component({
  selector: 'app-cron-schedule',
  imports: [ReactiveFormsModule, CopyButton],
  templateUrl: './cron-schedule.html',
  styleUrl: './cron-schedule.scss',
})
export class CronSchedule implements OnInit {
  /** Rendered inside Time Toolkit's tabs: the page already has a heading */
  @Input() embedded = false;

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly examples = [
    { expression: '* * * * *', label: 'every minute' },
    { expression: '*/5 * * * *', label: 'every 5 minutes' },
    { expression: '0 * * * *', label: 'every hour' },
    { expression: '0 0 * * *', label: 'every day at midnight' },
    { expression: '0 9 * * 1-5', label: 'weekdays at 09:00' },
    { expression: '30 2 * * 0', label: 'Sunday at 02:30' },
    { expression: '0 0 1 * *', label: 'first day of the month' },
    { expression: '0 */15 * * * *', label: 'Spring: every 15 min (with seconds)' },
  ];

  readonly zones: { id: TimeZoneMode; label: string }[] = [
    { id: 'bangkok', label: 'Bangkok (GMT+7)' },
    { id: 'utc', label: 'UTC' },
    { id: 'local', label: 'Local' },
  ];

  private readonly fieldHelp: Record<CronFieldName, FieldHelp> = {
    second: { name: 'second', label: 'second', allowed: '0-59' },
    minute: { name: 'minute', label: 'minute', allowed: '0-59' },
    hour: { name: 'hour', label: 'hour', allowed: '0-23' },
    dayOfMonth: { name: 'dayOfMonth', label: 'day (month)', allowed: '1-31' },
    month: { name: 'month', label: 'month', allowed: '1-12 or JAN-DEC' },
    dayOfWeek: { name: 'dayOfWeek', label: 'day (week)', allowed: '0-6 or SUN-SAT (7 = Sunday)' },
  };

  readonly symbols = [
    { symbol: '*', meaning: 'any value' },
    { symbol: ',', meaning: 'value list separator' },
    { symbol: '-', meaning: 'range of values' },
    { symbol: '/', meaning: 'step values' },
    { symbol: '?', meaning: 'any (day fields, Spring/Quartz)' },
    { symbol: '@daily', meaning: '@yearly @monthly @weekly @daily @hourly' },
  ];

  form = this.fb.nonNullable.group({
    expression: ['5 4 * * sun'],
    zone: ['bangkok' as TimeZoneMode],
  });

  schedule: Schedule | null = null;
  error: CronError | null = null;
  nextRuns: Date[] = [];
  /** Field under the text cursor, highlighted in the legend */
  activeField: CronFieldName | null = null;

  ngOnInit() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.update());
    this.update();
  }

  /** Legend rows in expression order: 5 fields, or 6 when seconds are used */
  get legend(): FieldHelp[] {
    const names: CronFieldName[] = this.schedule?.withSeconds
      ? ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
      : ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
    return names.map(name => this.fieldHelp[name]);
  }

  fieldRaw(name: CronFieldName) {
    return this.schedule?.fields.find(field => field.name === name)?.raw ?? '';
  }

  use(expression: string) {
    this.form.patchValue({ expression });
  }

  formatRun(date: Date) {
    return EpochUtils.formatLong(date, this.form.getRawValue().zone);
  }

  relative(date: Date) {
    return EpochUtils.relative(date);
  }

  onCursor(input: HTMLInputElement) {
    const position = input.selectionStart ?? 0;
    const offset = input.value.length - input.value.trimStart().length;
    const field = this.schedule?.fields.find(f => position - offset >= f.start && position - offset <= f.end);
    this.activeField = field?.name ?? null;
  }

  private update() {
    // valueChanges also fires for example buttons (patchValue), which zoneless CD doesn't see on its own
    this.cdr.markForCheck();
    const { expression, zone } = this.form.getRawValue();
    try {
      this.schedule = CronUtils.parse(expression);
      this.error = null;
      this.nextRuns = CronUtils.nextRuns(this.schedule, 5, new Date(), zone);
    } catch (e) {
      this.schedule = null;
      this.nextRuns = [];
      this.error = e instanceof CronError ? e : new CronError(String(e));
    }
  }
}
