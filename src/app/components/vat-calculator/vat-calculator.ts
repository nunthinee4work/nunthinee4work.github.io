import { Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { VatMode, VatUtils } from '../../utils/vat.utils';

interface VatRow {
  key: 'priceIncVat' | 'vat' | 'priceExcVat';
  label: string;
  /** Plain number for copying, e.g. 1070.000000 */
  value: string;
  /** With thousand separators for reading, e.g. 1,070.000000 */
  display: string;
}

/** Thai VAT split / add: type one price, get priceIncVat / vat / priceExcVat to 6 decimals (live). */
@Component({
  selector: 'app-vat-calculator',
  imports: [ReactiveFormsModule, CopyButton],
  templateUrl: './vat-calculator.html',
  styleUrl: './vat-calculator.scss',
})
export class VatCalculator {
  /** Rendered inside the Calculator toolkit's tabs: the page already has a heading */
  @Input() embedded = false;

  private readonly fb = inject(FormBuilder);

  readonly modes: { id: VatMode; label: string; key: string }[] = [
    { id: 'exc', label: 'ราคาก่อน VAT', key: 'priceExcVat' },
    { id: 'inc', label: 'ราคารวม VAT', key: 'priceIncVat' },
  ];
  readonly formulas: Record<VatMode, string> = {
    inc: 'priceExcVat = priceIncVat ÷ (1 + rate) · vat = priceIncVat − priceExcVat',
    exc: 'vat = priceExcVat × rate · priceIncVat = priceExcVat + vat',
  };

  form = this.fb.nonNullable.group({
    mode: ['inc' as VatMode],
    amount: [''],
    rate: ['7'],
  });

  rows: VatRow[] = [];
  rateInvalid = false;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.update());
    this.update();
  }

  get mode() {
    return this.form.getRawValue().mode;
  }

  setMode(mode: VatMode) {
    this.form.controls.mode.setValue(mode);
  }

  clear() {
    this.form.controls.amount.setValue('');
  }

  private update() {
    const { mode, amount, rate } = this.form.getRawValue();
    const ratePercent = VatUtils.parse(rate);
    this.rateInvalid = !(ratePercent >= 0);
    const value = VatUtils.parse(amount);
    const result = Number.isFinite(value) && !this.rateInvalid
      ? VatUtils.calculate(value, ratePercent, mode)
      : { priceIncVat: 0, vat: 0, priceExcVat: 0 };
    const row = (key: VatRow['key'], label: string, amount: number): VatRow =>
      ({ key, label, value: VatUtils.format(amount), display: VatUtils.formatGrouped(amount) });
    this.rows = [
      row('priceIncVat', 'ราคารวม VAT', result.priceIncVat),
      row('vat', 'VAT', result.vat),
      row('priceExcVat', 'ราคาก่อน VAT', result.priceExcVat),
    ];
  }
}
