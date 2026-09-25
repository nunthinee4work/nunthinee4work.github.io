export type VatMode = 'inc' | 'exc';

export interface VatResult {
  priceIncVat: number;
  vat: number;
  priceExcVat: number;
}

export class VatUtils {
  static readonly DECIMALS = 6;

  /** "1,070.50" -> 1070.5; blank / text -> NaN */
  static parse(text: string | number | null | undefined): number {
    const value = parseFloat(String(text ?? '').replace(/,/g, '').trim());
    return Number.isFinite(value) ? value : NaN;
  }

  static round(value: number, decimals = VatUtils.DECIMALS): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  static format(value: number, decimals = VatUtils.DECIMALS): string {
    return VatUtils.round(value, decimals).toFixed(decimals);
  }

  /** 1070.5 -> "1,070.500000" (display only; copy the plain `format` value) */
  static formatGrouped(value: number, decimals = VatUtils.DECIMALS): string {
    const [whole, fraction] = VatUtils.format(value, decimals).split('.');
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
  }

  /**
   * `inc`: amount includes VAT -> priceExcVat = amount / (1 + rate), vat = amount - priceExcVat.
   * `exc`: amount excludes VAT -> vat = amount × rate, priceIncVat = amount + vat.
   * `ratePercent` is e.g. 7 for 7 %.
   */
  static calculate(amount: number, ratePercent: number, mode: VatMode): VatResult {
    const rate = ratePercent / 100;
    if (mode === 'inc') {
      const priceExcVat = amount / (1 + rate);
      return { priceIncVat: amount, vat: amount - priceExcVat, priceExcVat };
    }
    const vat = amount * rate;
    return { priceIncVat: amount + vat, vat, priceExcVat: amount };
  }
}
