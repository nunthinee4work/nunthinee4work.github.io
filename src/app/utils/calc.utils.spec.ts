import { CalcUtils } from './calc.utils';

describe('CalcUtils', () => {
  const value = (expression: string) => CalcUtils.evaluateExpression(expression);
  const results = (text: string) => CalcUtils.evaluate(text).map(line => line.kind === 'value' ? line.value : line.kind);

  it('should follow operator precedence and parentheses', () => {
    expect(value('100+100/100')).toBe(101);
    expect(value('(100 + 100) / 100')).toBe(2);
    expect(value('2 ^ 3 ^ 2')).toBe(512);
    expect(value('-2 ^ 2')).toBe(-4);
    expect(value('2 ^ -1')).toBe(0.5);
    expect(value('7 × 6 ÷ 2')).toBe(21);
    expect(value('10 mod 4')).toBe(2);
  });

  it('should read thousand separators and decimals', () => {
    expect(value('1,070.50 + .5')).toBe(1071);
  });

  it('should handle percentages like Numi', () => {
    expect(value('20%')).toBe(0.2);
    expect(value('100 + 7%')).toBeCloseTo(107);
    expect(value('100 - 10%')).toBe(90);
    expect(value('20% of 150')).toBe(30);
    expect(value('200 * 15%')).toBe(30);
  });

  it('should reject what it cannot read', () => {
    expect(value('1 / 0')).toBeNull();
    expect(value('hello')).toBeNull();
    expect(value('2 +')).toBeNull();
    expect(value('(1 + 2')).toBeNull();
    expect(value('')).toBeNull();
  });

  it('should support functions and constants', () => {
    expect(value('sqrt(16) + abs(-2)')).toBe(6);
    expect(value('round(2.5)')).toBe(3);
    expect(value('pi')).toBeCloseTo(Math.PI);
  });

  it('should evaluate a notepad with headers, comments, variables and aggregates', () => {
    const text = [
      '#RC0001',
      'ค่าส่ง = 50',
      'ค่าของ: 200 // จากใบเสร็จ',
      'ค่าส่ง * 2',
      'sum',
      '',
      '// block 2',
      '10',
      'prev * 3',
      'avg',
      'nonsense',
    ].join('\n');
    expect(results(text)).toEqual(['header', 50, 200, 100, 350, 'empty', 'comment', 10, 30, 20, 'error']);
    expect(CalcUtils.evaluate(text)[1].variable).toBe('ค่าส่ง');
  });

  it('should total every result', () => {
    expect(CalcUtils.total(CalcUtils.evaluate('#RC0001\n100+100/100'))).toBe(101);
    expect(CalcUtils.total(CalcUtils.evaluate('10\n20\nsum\nprev'))).toBe(60); // 10 + 20 + prev (30); sum left out
    expect(CalcUtils.splitComment('2 * 3 // note')).toEqual(['2 * 3 ', '// note']);
    expect(CalcUtils.splitComment('# a // b')).toEqual(['# a // b', '']);
  });

  it('should format results for reading and copying', () => {
    expect(CalcUtils.format(1234567.5)).toBe('1,234,567.5');
    expect(CalcUtils.format(0.1 + 0.2)).toBe('0.3');
    expect(CalcUtils.format(-1000)).toBe('-1,000');
    expect(CalcUtils.plain(1234567.5)).toBe('1234567.5');
  });

  it('should round each line at the calculation precision before later lines use it', () => {
    const text = 'a = 10 / 3\na * 3\nsum';
    expect(CalcUtils.evaluate(text).map(line => line.value)).toEqual([10 / 3, 10, 10 / 3 + 10]);
    const rounded = CalcUtils.evaluate(text, { precision: 2 });
    expect(rounded.map(line => line.value)).toEqual([3.33, 9.99, 13.32]);
    expect(CalcUtils.total(rounded)).toBeCloseTo(13.32);
  });

  it('should round half away from zero', () => {
    expect(CalcUtils.round(2.345, 2)).toBe(2.35);
    expect(CalcUtils.round(1.005, 2)).toBe(1.01);
    expect(CalcUtils.round(-2.5, 0)).toBe(-3);
    expect(CalcUtils.round(-0.001, 2)).toBe(0);
    expect(CalcUtils.round(1e-7, 10)).toBe(1e-7);
    expect(CalcUtils.round(1e-7, 2)).toBe(0);
    expect(CalcUtils.format(0.0000001)).toBe('0.0000001');
  });

  it('should show a fixed number of decimals when asked', () => {
    expect(CalcUtils.format(101, 2)).toBe('101.00');
    expect(CalcUtils.format(1234.5678, 2)).toBe('1,234.57');
    expect(CalcUtils.format(2.5, 0)).toBe('3');
    expect(CalcUtils.plain(1234.5, 3)).toBe('1234.500');
    expect(CalcUtils.format(1 / 3)).toBe('0.3333333333');
  });
});
