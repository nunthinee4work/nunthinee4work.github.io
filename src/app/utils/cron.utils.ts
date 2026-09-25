import { EpochUtils, TimeZoneMode } from './epoch.utils';

export type CronFieldName = 'second' | 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export interface CronFieldInfo {
  name: CronFieldName;
  label: string;
  raw: string;
  /** Allowed values, sorted */
  values: number[];
  /** true when the field is `*` / `?` (matches everything) */
  any: boolean;
  /** Offset range of this field in the (trimmed) expression, for cursor highlighting */
  start: number;
  end: number;
}

export interface CronSchedule {
  /** 5-field (standard) or 6-field (with seconds, Spring @Scheduled style) */
  withSeconds: boolean;
  fields: CronFieldInfo[];
  description: string;
}

export class CronError extends Error {
  constructor(message: string, readonly field?: CronFieldName) {
    super(message);
  }
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SPECS: Record<CronFieldName, { label: string; min: number; max: number; names?: string[]; nameOffset?: number }> = {
  second: { label: 'second', min: 0, max: 59 },
  minute: { label: 'minute', min: 0, max: 59 },
  hour: { label: 'hour', min: 0, max: 23 },
  dayOfMonth: { label: 'day (month)', min: 1, max: 31 },
  month: { label: 'month', min: 1, max: 12, names: MONTHS, nameOffset: 1 },
  dayOfWeek: { label: 'day (week)', min: 0, max: 7, names: DAYS, nameOffset: 0 },
};

export const CRON_MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export class CronUtils {
  /** Parse a 5- or 6-field expression (or an @macro). Throws CronError with the offending field. */
  static parse(expression: string): CronSchedule {
    const trimmed = expression.trim();
    const text = CRON_MACROS[trimmed.toLowerCase()] ?? trimmed;
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length !== 5 && parts.length !== 6) {
      throw new CronError(`Expected 5 fields (or 6 with seconds), got ${parts.length}`);
    }
    const withSeconds = parts.length === 6;
    const names: CronFieldName[] = withSeconds
      ? ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
      : ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

    // Offsets are relative to the text the user typed (macros map to the whole input)
    let cursor = 0;
    const isMacro = text !== trimmed;
    const fields = parts.map((raw, index) => {
      const start = isMacro ? 0 : text.indexOf(raw, cursor);
      const end = isMacro ? trimmed.length : start + raw.length;
      cursor = end;
      const name = names[index];
      const values = CronUtils.parseField(raw, name);
      return { name, label: SPECS[name].label, raw, values, any: raw === '*' || raw === '?', start, end };
    });

    const schedule: CronSchedule = { withSeconds, fields, description: '' };
    schedule.description = CronUtils.describe(schedule);
    return schedule;
  }

  /** Next `count` run times after `from`, evaluated as wall-clock time in `zone`. */
  static nextRuns(schedule: CronSchedule, count = 5, from = new Date(), zone: TimeZoneMode = 'local'): Date[] {
    const field = (name: CronFieldName) => schedule.fields.find(f => f.name === name);
    const seconds = field('second')?.values ?? [0];
    const minutes = field('minute')!.values;
    const hours = field('hour')!.values;
    const dom = field('dayOfMonth')!;
    const months = new Set(field('month')!.values);
    const dow = field('dayOfWeek')!;
    const dowSet = new Set(dow.values.map(d => d % 7));
    const domSet = new Set(dom.values);

    const runs: Date[] = [];
    const start = EpochUtils.partsIn(from, zone);
    // Scan day by day (up to ~5 years) and expand matching days into times
    for (let dayOffset = 0; dayOffset < 366 * 5 && runs.length < count; dayOffset++) {
      const dayStart = EpochUtils.fromParts(start.year, start.month, start.day + dayOffset, 0, 0, 0, 0, zone);
      const p = EpochUtils.partsIn(dayStart, zone);
      if (!months.has(p.month + 1)) continue;
      const weekday = new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay();
      // Vixie cron: when both day fields are restricted, a day matches if EITHER matches
      const dayMatches = dom.any || dow.any
        ? domSet.has(p.day) && dowSet.has(weekday)
        : domSet.has(p.day) || dowSet.has(weekday);
      if (!dayMatches) continue;

      for (const h of hours) {
        for (const m of minutes) {
          for (const s of seconds) {
            const run = EpochUtils.fromParts(p.year, p.month, p.day, h, m, s, 0, zone);
            if (run.getTime() > from.getTime()) {
              runs.push(run);
              if (runs.length >= count) return runs;
            }
          }
        }
      }
    }
    return runs;
  }

  /** crontab.guru-style English description, e.g. "At 04:05 on Sunday." */
  static describe(schedule: CronSchedule): string {
    const get = (name: CronFieldName) => schedule.fields.find(f => f.name === name);
    const second = get('second');
    const minute = get('minute')!;
    const hour = get('hour')!;
    const dom = get('dayOfMonth')!;
    const month = get('month')!;
    const dow = get('dayOfWeek')!;
    const pad = (n: number) => String(n).padStart(2, '0');

    const single = (f: CronFieldInfo) => f.values.length === 1 && !/[*\/,-]/.test(f.raw);
    let time: string;
    const secondsPart = second && !(single(second) && second.values[0] === 0) ? CronUtils.phrase(second, 'second') : '';

    if (single(minute) && single(hour)) {
      const clock = `${pad(hour.values[0])}:${pad(minute.values[0])}`;
      time = second && single(second) ? `At ${clock}:${pad(second.values[0])}` : `At ${clock}`;
    } else {
      const minutePhrase = minute.any ? 'every minute' : CronUtils.phrase(minute, 'minute');
      const hourPhrase = hour.any ? '' : `past ${single(hour) ? `hour ${hour.values[0]}` : CronUtils.phrase(hour, 'hour')}`;
      time = 'At ' + [minutePhrase, hourPhrase].filter(Boolean).join(' ');
      if (secondsPart) time = `At ${secondsPart} ${time.slice(3)}`;
    }
    if (single(minute) && single(hour) && secondsPart && !single(second!)) time = `At ${secondsPart} at ${time.slice(3)}`;

    const dayParts: string[] = [];
    if (!dom.any) dayParts.push(`on ${CronUtils.phrase(dom, 'day-of-month')}`);
    if (!dow.any) {
      const days = CronUtils.phrase(dow, 'day-of-week', v => DAY_NAMES[v % 7]);
      dayParts.push(`${dom.any ? 'on' : 'and on'} ${days}`);
    }
    if (!month.any) dayParts.push(`in ${CronUtils.phrase(month, 'month', v => MONTH_NAMES[v - 1])}`);

    return `${[time, ...dayParts].join(' ')}.`;
  }

  /** Human phrase for one field: "every 5th minute", "minute 0 and 30", "every day-of-week from Monday through Friday" */
  private static phrase(field: CronFieldInfo, unit: string, name: (v: number) => string = v => String(v)): string {
    const pieces = field.raw.split(',').map(part => {
      const [range, stepText] = part.split('/');
      const step = stepText ? Number(stepText) : 0;
      if (range === '*' || range === '?') return step ? `every ${CronUtils.ordinal(step)} ${unit}` : `every ${unit}`;
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(v => CronUtils.valueOf(v, field.name));
        const span = `${name(a)} through ${name(b)}`;
        return step ? `every ${CronUtils.ordinal(step)} ${unit} from ${span}` : `every ${unit} from ${span}`;
      }
      const value = CronUtils.valueOf(range, field.name);
      return step ? `every ${CronUtils.ordinal(step)} ${unit} from ${name(value)}` : name(value);
    });
    const plain = pieces.every(p => !p.startsWith('every'));
    const joined = pieces.length > 1 ? `${pieces.slice(0, -1).join(', ')} and ${pieces[pieces.length - 1]}` : pieces[0];
    if (!plain) return joined;
    if (field.name === 'dayOfWeek' || field.name === 'month') return joined;
    return `${unit} ${joined}`;
  }

  private static ordinal(n: number): string {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
    return `${n}${suffix}`;
  }

  private static valueOf(token: string, name: CronFieldName): number {
    const spec = SPECS[name];
    const upper = token.toUpperCase();
    if (spec.names) {
      const index = spec.names.indexOf(upper);
      if (index >= 0) return index + (spec.nameOffset ?? 0);
    }
    if (!/^\d+$/.test(token)) throw new CronError(`Invalid ${spec.label} value "${token}"`, name);
    const value = Number(token);
    if (value < spec.min || value > spec.max) {
      throw new CronError(`${spec.label} must be ${spec.min}-${spec.max}, got ${value}`, name);
    }
    return value;
  }

  private static parseField(raw: string, name: CronFieldName): number[] {
    const spec = SPECS[name];
    const values = new Set<number>();
    for (const part of raw.split(',')) {
      if (!part) throw new CronError(`Empty value in ${spec.label}`, name);
      const [range, stepText, extra] = part.split('/');
      if (extra !== undefined) throw new CronError(`Invalid step in ${spec.label}: "${part}"`, name);
      const step = stepText === undefined ? 1 : Number(stepText);
      if (!Number.isInteger(step) || step < 1) throw new CronError(`Invalid step in ${spec.label}: "${part}"`, name);

      let from: number;
      let to: number;
      if (range === '*' || range === '?') {
        if (range === '?' && name !== 'dayOfMonth' && name !== 'dayOfWeek') {
          throw new CronError(`"?" is only allowed in day fields`, name);
        }
        from = spec.min;
        to = name === 'dayOfWeek' ? 6 : spec.max;
      } else if (range.includes('-')) {
        const [a, b] = range.split('-');
        from = CronUtils.valueOf(a, name);
        to = CronUtils.valueOf(b, name);
        if (from > to) throw new CronError(`Range ${range} in ${spec.label} goes backwards`, name);
      } else {
        from = CronUtils.valueOf(range, name);
        to = stepText === undefined ? from : (name === 'dayOfWeek' ? 6 : spec.max);
      }
      for (let v = from; v <= to; v += step) values.add(name === 'dayOfWeek' ? v % 7 : v);
    }
    return [...values].sort((a, b) => a - b);
  }
}
