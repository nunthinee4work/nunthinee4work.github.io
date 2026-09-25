import { CronError, CronUtils } from './cron.utils';

describe('CronUtils', () => {
  const describe_ = (expr: string) => CronUtils.parse(expr).description;

  it('should describe common schedules like crontab.guru', () => {
    expect(describe_('5 4 * * *')).toBe('At 04:05.');
    expect(describe_('5 4 * * sun')).toBe('At 04:05 on Sunday.');
    expect(describe_('*/5 * * * *')).toBe('At every 5th minute.');
    expect(describe_('* * * * *')).toBe('At every minute.');
    expect(describe_('0 9 * * 1-5')).toBe('At 09:00 on every day-of-week from Monday through Friday.');
    expect(describe_('0 0,12 1 */2 *')).toBe('At minute 0 past hour 0 and 12 on day-of-month 1 in every 2nd month.');
    expect(describe_('@daily')).toBe('At 00:00.');
  });

  it('should support 6-field Spring expressions with seconds', () => {
    const schedule = CronUtils.parse('0 */15 * * * *');
    expect(schedule.withSeconds).toBeTrue();
    expect(schedule.description).toBe('At every 15th minute.');
    expect(CronUtils.parse('30 0 9 * * MON-FRI').description).toBe('At 09:00:30 on every day-of-week from Monday through Friday.');
  });

  it('should list the next runs in Bangkok time', () => {
    const from = new Date('2026-09-23T01:00:00Z'); // 08:00 Bangkok, Wednesday
    const runs = CronUtils.nextRuns(CronUtils.parse('0 9 * * 1-5'), 3, from, 'bangkok');
    expect(runs.map(r => r.toISOString())).toEqual([
      '2026-09-23T02:00:00.000Z',
      '2026-09-24T02:00:00.000Z',
      '2026-09-25T02:00:00.000Z',
    ]);
  });

  it('should OR day-of-month and day-of-week when both are set (Vixie cron)', () => {
    const from = new Date('2026-09-01T00:00:00Z');
    const runs = CronUtils.nextRuns(CronUtils.parse('0 0 13 * 5'), 4, from, 'utc');
    // Fridays in September 2026 are 4, 11, 18, 25 — plus the 13th
    expect(runs.map(r => r.getUTCDate())).toEqual([4, 11, 13, 18]);
  });

  it('should treat 7 as Sunday and accept names', () => {
    expect(CronUtils.parse('0 0 * * 7').fields[4].values).toEqual([0]);
    expect(CronUtils.parse('0 0 1 jan-mar *').fields[3].values).toEqual([1, 2, 3]);
  });

  it('should report the field that is wrong', () => {
    try {
      CronUtils.parse('61 * * * *');
      fail('should throw');
    } catch (e) {
      expect(e instanceof CronError).toBeTrue();
      expect((e as CronError).field).toBe('minute');
    }
    expect(() => CronUtils.parse('* * *')).toThrowError(/5 fields/);
    expect(() => CronUtils.parse('*/0 * * * *')).toThrow();
  });

  it('should record where each field sits in the text', () => {
    const fields = CronUtils.parse('5  4 * * *').fields;
    expect([fields[1].start, fields[1].end]).toEqual([3, 4]);
  });
});
