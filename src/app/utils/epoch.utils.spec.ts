import { EpochUtils } from './epoch.utils';

describe('EpochUtils', () => {
  it('should detect the unit from magnitude', () => {
    expect(EpochUtils.detectUnit(1790000000)).toBe('s');
    expect(EpochUtils.detectUnit(1790000000000)).toBe('ms');
    expect(EpochUtils.detectUnit(1790000000000000)).toBe('us');
    expect(EpochUtils.detectUnit(1790000000000000000)).toBe('ns');
  });

  it('should parse timestamps in any unit to the same instant', () => {
    const iso = '2026-09-23T07:05:09.000Z';
    expect(EpochUtils.parse('1790147109')!.date.toISOString()).toBe(iso);
    expect(EpochUtils.parse('1790147109000')!.date.toISOString()).toBe(iso);
    expect(EpochUtils.parse('1790147109000000')!.date.toISOString()).toBe(iso);
    expect(EpochUtils.parse('1790147109', 'ms')!.date.getTime()).toBe(1790147109);
  });

  it('should read the creation time from a MongoDB ObjectId', () => {
    const parsed = EpochUtils.parse('ObjectId("6ab378f77878c679bbdff386")')!;
    expect(parsed.fromObjectId).toBeTrue();
    expect(parsed.date.getTime()).toBe(0x6ab378f7 * 1000);
  });

  it('should reject garbage', () => {
    expect(EpochUtils.parse('hello')).toBeNull();
    expect(EpochUtils.parse('')).toBeNull();
  });

  it('should convert wall-clock time in Bangkok and UTC', () => {
    expect(EpochUtils.fromParts(2026, 8, 23, 14, 0, 0, 0, 'bangkok').toISOString()).toBe('2026-09-23T07:00:00.000Z');
    expect(EpochUtils.fromParts(2026, 8, 23, 14, 0, 0, 0, 'utc').toISOString()).toBe('2026-09-23T14:00:00.000Z');
    expect(EpochUtils.fromInputValue('2026-09-23T14:00:05', 'bangkok')!.toISOString()).toBe('2026-09-23T07:00:05.000Z');
    expect(EpochUtils.toInputValue(new Date('2026-09-23T07:00:05Z'), 'bangkok')).toBe('2026-09-23T14:00:05');
  });

  it('should give start and end of day / month / year in a zone', () => {
    const date = new Date('2026-09-23T20:00:00Z'); // 24 Sep 03:00 in Bangkok
    const day = EpochUtils.range(date, 'day', 'bangkok');
    expect(day.start.toISOString()).toBe('2026-09-23T17:00:00.000Z');
    expect(day.end.toISOString()).toBe('2026-09-24T16:59:59.999Z');
    expect(EpochUtils.range(date, 'month', 'utc').end.toISOString()).toBe('2026-09-30T23:59:59.999Z');
    expect(EpochUtils.range(date, 'year', 'utc').start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should describe relative time and durations', () => {
    const now = new Date('2026-09-23T12:00:00Z');
    expect(EpochUtils.relative(new Date('2026-09-23T09:00:00Z'), now)).toBe('3 hours ago');
    expect(EpochUtils.relative(new Date('2026-09-25T12:00:00Z'), now)).toBe('in 2 days');
    expect(EpochUtils.formatDuration(93784)).toBe('1 day 2 hours 3 minutes 4 seconds');
    expect(EpochUtils.formatDuration(0)).toBe('0 seconds');
  });

  it('should format in Thai with Buddhist year', () => {
    expect(EpochUtils.formatThai(new Date('2026-09-23T07:05:09Z'))).toContain('2569');
  });

  it('should convert between time units', () => {
    const result = EpochUtils.convertTime(1800, 's');
    const byId = Object.fromEntries(result.map(r => [r.id, r.value]));
    expect(byId['min']).toBe(30);
    expect(byId['h']).toBe(0.5);
    expect(byId['ms']).toBe(1800000);
    expect(EpochUtils.convertTime(2, 'day').find(r => r.id === 'h')!.value).toBe(48);
  });

  it('should format converted numbers readably', () => {
    expect(EpochUtils.formatNumber(1800000)).toBe('1,800,000');
    expect(EpochUtils.formatNumber(1 / 3)).toBe('0.333333');
    expect(EpochUtils.formatNumber(0)).toBe('0');
  });

  it('should count the time between two clock times', () => {
    expect(EpochUtils.timeBetween('13:30', '15:00')).toEqual({ seconds: 5400, overnight: false });
    expect(EpochUtils.timeBetween('22:00', '06:00')).toEqual({ seconds: 8 * 3600, overnight: true });
    expect(EpochUtils.timeBetween('09:00', '18:00', 60)!.seconds).toBe(8 * 3600);
    expect(EpochUtils.timeBetween('09:00', '09:00')!.seconds).toBe(0);
    expect(EpochUtils.timeBetween('25:00', '09:00')).toBeNull();
  });

  it('should show 12-hour clock labels', () => {
    expect(EpochUtils.to12Hour('13:30')).toBe('1:30 PM');
    expect(EpochUtils.to12Hour('00:05')).toBe('12:05 AM');
    expect(EpochUtils.to12Hour('12:00')).toBe('12:00 PM');
  });
});
