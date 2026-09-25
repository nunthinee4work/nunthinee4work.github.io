import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { CronSchedule } from '../cron-schedule/cron-schedule';
import { EpochUnit, EpochUtils, ParsedTimestamp, TimeUnit, TimeZoneMode } from '../../utils/epoch.utils';

interface OutputRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-epoch-converter',
  imports: [ReactiveFormsModule, CopyButton, CronSchedule],
  templateUrl: './epoch-converter.html',
  styleUrl: './epoch-converter.scss',
})
export class EpochConverter implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly unitLabels = EpochUtils.UNIT_LABELS;
  readonly zones: { id: TimeZoneMode; label: string }[] = [
    { id: 'bangkok', label: 'Bangkok (GMT+7)' },
    { id: 'utc', label: 'UTC / GMT' },
    { id: 'local', label: 'Local (this computer)' },
  ];
  readonly periods = ['day', 'month', 'year'] as const;
  readonly timeUnits = EpochUtils.TIME_UNITS;
  readonly formatNumber = EpochUtils.formatNumber;

  private static readonly SECTION_KEY = 'timeToolkit.section';

  readonly sections = [
    { id: 'epoch', label: 'Epoch & Date', icon: 'fa-calendar-day' },
    { id: 'duration', label: 'Duration', icon: 'fa-hourglass-half' },
    { id: 'cron', label: 'Cron Schedule', icon: 'fa-calendar-check' },
  ] as const;

  /** Last opened section is remembered per browser (convenience only) */
  section: 'epoch' | 'duration' | 'cron' = EpochConverter.readSection();

  /** Ticks every second for the live clock */
  readonly now = signal(Date.now());

  form = this.fb.nonNullable.group({
    timestamp: [String(Math.floor(Date.now() / 1000))],
    unit: ['auto' as EpochUnit | 'auto'],
    dateTime: [EpochUtils.toInputValue(new Date(), 'bangkok')],
    dateZone: ['bangkok' as TimeZoneMode],
    rangeZone: ['bangkok' as TimeZoneMode],
    duration: ['1800'],
    durationUnit: ['s' as TimeUnit],
    batch: [''],
    fromTime: ['13:30'],
    toTime: ['15:00'],
    breakMinutes: ['0'],
  });

  parsed: ParsedTimestamp | null = null;
  timestampRows: OutputRow[] = [];
  dateResult: Date | null = null;

  ngOnInit() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.update());
    this.update();
  }

  /** Re-evaluated every tick of `now`, so "5 seconds ago" keeps counting */
  get relative() {
    return this.parsed ? EpochUtils.relative(this.parsed.date, new Date(this.now())) : '';
  }

  get currentSeconds() {
    return Math.floor(this.now() / 1000);
  }

  get zoneLabel() {
    return this.zones.find(zone => zone.id === this.form.getRawValue().dateZone)?.label ?? '';
  }

  get localZoneName() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  readonly to12Hour = EpochUtils.to12Hour;

  /** Hours between two clock times, like online-calculator.org */
  get timeSpan() {
    const { fromTime, toTime, breakMinutes } = this.form.getRawValue();
    const span = EpochUtils.timeBetween(fromTime, toTime, Number(breakMinutes) || 0);
    if (!span) return null;
    return {
      ...span,
      human: EpochUtils.formatDuration(span.seconds),
      hours: EpochUtils.formatNumber(span.seconds / 3600),
      minutes: EpochUtils.formatNumber(span.seconds / 60),
    };
  }

  /** Seconds (etc.) -> every other time unit, like converter.net */
  get conversions() {
    const { duration, durationUnit } = this.form.getRawValue();
    const value = Number(duration);
    if (!String(duration).trim() || !isFinite(value)) return null;
    const results = EpochUtils.convertTime(value, durationUnit);
    const fromLabel = this.timeUnits.find(unit => unit.id === durationUnit)!.label;
    const seconds = results.find(result => result.id === 's')!.value;
    return {
      value,
      fromLabel,
      results: results.filter(result => result.id !== durationUnit),
      human: EpochUtils.formatDuration(seconds),
    };
  }

  get ranges() {
    const date = this.dateResult ?? this.parsed?.date ?? new Date(this.now());
    const zone = this.form.getRawValue().rangeZone;
    return this.periods.map(period => ({ period, ...EpochUtils.range(date, period, zone) }));
  }

  get batchRows() {
    return this.form.getRawValue().batch
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 500)
      .map(line => {
        const parsed = EpochUtils.parse(line, this.form.getRawValue().unit);
        return {
          input: line,
          utc: parsed ? parsed.date.toISOString() : 'Invalid',
          bangkok: parsed ? EpochUtils.formatLong(parsed.date, 'bangkok') : '',
          ok: !!parsed,
        };
      });
  }

  get batchCsv() {
    return this.batchRows.map(row => `${row.input},${row.utc}`).join('\n');
  }

  seconds(date: Date) {
    return Math.floor(date.getTime() / 1000);
  }

  /** Old tool links (e.g. #cronSchedule) opened while this toolkit is already showing */
  @HostListener('window:toolkit-section', ['$event'])
  onSectionRequest(event: Event) {
    const { key, value } = (event as CustomEvent<{ key: string; value: string }>).detail ?? {};
    if (key === EpochConverter.SECTION_KEY && (['epoch', 'duration', 'cron'] as string[]).includes(value)) {
      this.setSection(value as typeof this.section);
    }
  }

  setSection(section: 'epoch' | 'duration' | 'cron') {
    this.section = section;
    try {
      localStorage.setItem(EpochConverter.SECTION_KEY, section);
    } catch {
      // storage unavailable — the tab just won't be remembered
    }
  }

  private static readSection(): 'epoch' | 'duration' | 'cron' {
    try {
      const saved = localStorage.getItem(EpochConverter.SECTION_KEY);
      return saved === 'duration' || saved === 'cron' ? saved : 'epoch';
    } catch {
      return 'epoch';
    }
  }

  useNowTimestamp() {
    this.form.patchValue({ timestamp: String(this.currentSeconds), unit: 'auto' });
  }

  useNowDate() {
    this.form.patchValue({ dateTime: EpochUtils.toInputValue(new Date(), this.form.getRawValue().dateZone) });
  }

  private update() {
    // valueChanges also fires for programmatic patches, which zoneless CD doesn't see on its own
    this.cdr.markForCheck();
    const { timestamp, unit, dateTime, dateZone } = this.form.getRawValue();

    this.parsed = EpochUtils.parse(timestamp, unit);
    this.timestampRows = this.parsed ? this.describe(this.parsed.date) : [];
    this.dateResult = EpochUtils.fromInputValue(dateTime, dateZone);
  }

  private describe(date: Date): OutputRow[] {
    const rows: OutputRow[] = [
      { label: 'GMT / UTC', value: EpochUtils.formatLong(date, 'utc') },
      { label: 'Bangkok (GMT+7)', value: EpochUtils.formatLong(date, 'bangkok') },
      { label: 'ภาษาไทย (พ.ศ.)', value: EpochUtils.formatThai(date) },
    ];
    if (EpochUtils.offsetMinutes('local', date) !== 7 * 60) {
      rows.push({ label: `Your time zone (${this.localZoneName})`, value: EpochUtils.formatLong(date, 'local') });
    }
    rows.push(
      { label: 'ISO 8601', value: date.toISOString() },
      { label: 'MongoDB', value: `ISODate("${date.toISOString()}")` },
    );
    return rows;
  }
}
