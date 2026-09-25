export type EpochUnit = 's' | 'ms' | 'us' | 'ns';
export type TimeZoneMode = 'local' | 'utc' | 'bangkok';

export interface ParsedTimestamp {
  date: Date;
  unit: EpochUnit;
  /** Input was a MongoDB ObjectId (its first 4 bytes are the creation time in seconds) */
  fromObjectId: boolean;
}

const UNIT_DIVISOR: Record<EpochUnit, number> = { s: 1e-3, ms: 1, us: 1e3, ns: 1e6 };
const BANGKOK_OFFSET_MINUTES = 7 * 60; // Asia/Bangkok has no DST

export type TimeUnit = 'ms' | 's' | 'min' | 'h' | 'day' | 'week' | 'month' | 'year';

export class EpochUtils {
  /** Length of each unit in seconds; month and year use the average Gregorian length. */
  static readonly TIME_UNITS: { id: TimeUnit; label: string; seconds: number }[] = [
    { id: 'ms', label: 'milliseconds', seconds: 0.001 },
    { id: 's', label: 'seconds', seconds: 1 },
    { id: 'min', label: 'minutes', seconds: 60 },
    { id: 'h', label: 'hours', seconds: 3600 },
    { id: 'day', label: 'days', seconds: 86400 },
    { id: 'week', label: 'weeks', seconds: 604800 },
    { id: 'month', label: 'months', seconds: 2629746 },
    { id: 'year', label: 'years', seconds: 31556952 },
  ];

  /**
   * Time between two clock times ("HH:mm" or "HH:mm:ss"), e.g. 13:30 -> 15:00 = 90 minutes.
   * An end earlier than the start is treated as the next day (overnight shift). `breakMinutes` is deducted.
   */
  static timeBetween(start: string, end: string, breakMinutes = 0): { seconds: number; overnight: boolean } | null {
    const toSeconds = (value: string) => {
      const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
      if (!match) return null;
      const [h, m, sec] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
      return h < 24 && m < 60 && sec < 60 ? h * 3600 + m * 60 + sec : null;
    };
    const from = toSeconds(start);
    const to = toSeconds(end);
    if (from === null || to === null) return null;
    const overnight = to < from;
    const seconds = (overnight ? to + 86400 : to) - from - Math.max(0, breakMinutes) * 60;
    return { seconds: Math.max(0, seconds), overnight };
  }

  /** "13:30" -> "1:30 PM" */
  static to12Hour(value: string): string {
    const match = /^(\d{1,2}):(\d{2})/.exec(value);
    if (!match) return value;
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
  }

  /** Convert `value` in `from` to every unit. */
  static convertTime(value: number, from: TimeUnit): { id: TimeUnit; label: string; value: number }[] {
    const seconds = value * EpochUtils.TIME_UNITS.find(unit => unit.id === from)!.seconds;
    return EpochUtils.TIME_UNITS.map(unit => ({ id: unit.id, label: unit.label, value: seconds / unit.seconds }));
  }

  /** 30 -> "30", 0.5 -> "0.5", 1/3 -> "0.333333", 1e-9 -> "1e-9" */
  static formatNumber(value: number): string {
    if (value !== 0 && Math.abs(value) < 1e-6) return value.toExponential(3).replace(/\.?0+e/, 'e');
    return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }

  static readonly UNIT_LABELS: Record<EpochUnit, string> = {
    s: 'seconds',
    ms: 'milliseconds',
    us: 'microseconds',
    ns: 'nanoseconds',
  };

  /** Guess the unit from magnitude, the way epochconverter.com does (by digit count around "now"). */
  static detectUnit(value: number): EpochUnit {
    const abs = Math.abs(value);
    if (abs < 1e11) return 's';
    if (abs < 1e14) return 'ms';
    if (abs < 1e17) return 'us';
    return 'ns';
  }

  /** Accepts a Unix timestamp (s/ms/µs/ns, unit auto-detected unless given) or a 24-hex MongoDB ObjectId. */
  static parse(input: string, unit: EpochUnit | 'auto' = 'auto'): ParsedTimestamp | null {
    const text = input.trim().replace(/^ObjectId\(\s*["']?|["']?\s*\)$/g, '');
    if (/^[0-9a-f]{24}$/i.test(text)) {
      return { date: new Date(parseInt(text.slice(0, 8), 16) * 1000), unit: 's', fromObjectId: true };
    }
    if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
    const value = Number(text);
    const resolved = unit === 'auto' ? EpochUtils.detectUnit(value) : unit;
    const date = new Date(value / UNIT_DIVISOR[resolved]);
    return isNaN(date.getTime()) ? null : { date, unit: resolved, fromObjectId: false };
  }

  static offsetMinutes(zone: TimeZoneMode, date: Date): number {
    if (zone === 'utc') return 0;
    if (zone === 'bangkok') return BANGKOK_OFFSET_MINUTES;
    return -date.getTimezoneOffset();
  }

  /** Wall-clock parts of `date` as seen in `zone`. */
  static partsIn(date: Date, zone: TimeZoneMode) {
    const shifted = new Date(date.getTime() + EpochUtils.offsetMinutes(zone, date) * 60000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth(),
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
      millisecond: shifted.getUTCMilliseconds(),
    };
  }

  /** Build a Date from wall-clock parts in `zone`. Month is 0-based. */
  static fromParts(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0, zone: TimeZoneMode = 'local'): Date {
    if (zone === 'local') return new Date(year, month, day, hour, minute, second, ms);
    const utc = Date.UTC(year, month, day, hour, minute, second, ms);
    return new Date(utc - EpochUtils.offsetMinutes(zone, new Date(utc)) * 60000);
  }

  /** `<input type="datetime-local">` value (YYYY-MM-DDTHH:mm:ss) for `date` in `zone`. */
  static toInputValue(date: Date, zone: TimeZoneMode): string {
    const p = EpochUtils.partsIn(date, zone);
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return `${pad(p.year, 4)}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
  }

  static fromInputValue(value: string, zone: TimeZoneMode): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
    if (!match) return null;
    const [, y, mo, d, h, mi, s] = match.map(Number);
    return EpochUtils.fromParts(y, mo - 1, d, h, mi, s || 0, 0, zone);
  }

  /** Start and end (inclusive, last millisecond) of the day / month / year containing `date`, in `zone`. */
  static range(date: Date, period: 'day' | 'month' | 'year', zone: TimeZoneMode): { start: Date; end: Date } {
    const p = EpochUtils.partsIn(date, zone);
    const start = period === 'day'
      ? EpochUtils.fromParts(p.year, p.month, p.day, 0, 0, 0, 0, zone)
      : period === 'month'
        ? EpochUtils.fromParts(p.year, p.month, 1, 0, 0, 0, 0, zone)
        : EpochUtils.fromParts(p.year, 0, 1, 0, 0, 0, 0, zone);
    const next = period === 'day'
      ? EpochUtils.fromParts(p.year, p.month, p.day + 1, 0, 0, 0, 0, zone)
      : period === 'month'
        ? EpochUtils.fromParts(p.year, p.month + 1, 1, 0, 0, 0, 0, zone)
        : EpochUtils.fromParts(p.year + 1, 0, 1, 0, 0, 0, 0, zone);
    return { start, end: new Date(next.getTime() - 1) };
  }

  /** e.g. `Wednesday, 23 September 2026 at 14:05:09 GMT+7` */
  static formatLong(date: Date, zone: TimeZoneMode, locale = 'en-GB'): string {
    return new Intl.DateTimeFormat(locale, {
      timeZone: EpochUtils.ianaZone(zone),
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(date);
  }

  /** Thai format with Buddhist-era year, e.g. `วันพุธที่ 23 กันยายน พ.ศ. 2569 เวลา 14:05:09` */
  static formatThai(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(date);
  }

  /** "3 hours ago", "in 2 days" */
  static relative(date: Date, now = new Date(), locale = 'en'): string {
    const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1],
    ];
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size || unit === 'second') return format.format(Math.round(seconds / size), unit);
    }
    return '';
  }

  /** 93784 -> "1 day 2 hours 3 minutes 4 seconds" */
  static formatDuration(totalSeconds: number): string {
    if (!isFinite(totalSeconds)) return '';
    const sign = totalSeconds < 0 ? '-' : '';
    let rest = Math.floor(Math.abs(totalSeconds));
    const parts: string[] = [];
    for (const [name, size] of [['year', 31536000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]] as const) {
      const amount = Math.floor(rest / size);
      rest -= amount * size;
      if (amount) parts.push(`${amount} ${name}${amount === 1 ? '' : 's'}`);
    }
    return sign + (parts.join(' ') || '0 seconds');
  }

  private static ianaZone(zone: TimeZoneMode): string | undefined {
    return zone === 'utc' ? 'UTC' : zone === 'bangkok' ? 'Asia/Bangkok' : undefined;
  }
}
