import { VatUtils } from './vat.utils';

describe('VatUtils', () => {
  it('should split a VAT-inclusive price', () => {
    const result = VatUtils.calculate(107, 7, 'inc');
    expect(VatUtils.format(result.priceExcVat)).toBe('100.000000');
    expect(VatUtils.format(result.vat)).toBe('7.000000');
  });

  it('should add VAT to a price before VAT', () => {
    const result = VatUtils.calculate(100, 7, 'exc');
    expect(VatUtils.format(result.vat)).toBe('7.000000');
    expect(VatUtils.format(result.priceIncVat)).toBe('107.000000');
  });

  it('should keep 6 decimals', () => {
    const result = VatUtils.calculate(99, 7, 'inc');
    expect(VatUtils.format(result.priceExcVat)).toBe('92.523364');
    expect(VatUtils.format(result.vat)).toBe('6.476636');
  });

  it('should parse numbers with thousand separators', () => {
    expect(VatUtils.parse('1,070.50')).toBe(1070.5);
    expect(VatUtils.parse('')).toBeNaN();
    expect(VatUtils.parse('abc')).toBeNaN();
  });

  it('should group thousands for display only', () => {
    expect(VatUtils.formatGrouped(1234567.5)).toBe('1,234,567.500000');
    expect(VatUtils.formatGrouped(-1070)).toBe('-1,070.000000');
    expect(VatUtils.formatGrouped(7)).toBe('7.000000');
  });
});
