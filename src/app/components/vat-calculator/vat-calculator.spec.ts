import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VatCalculator } from './vat-calculator';

describe('VatCalculator', () => {
  let fixture: ComponentFixture<VatCalculator>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VatCalculator],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(VatCalculator);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const type = (index: number, text: string) => {
    const input = el.querySelectorAll('input')[index] as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const values = () => [...el.querySelectorAll('.ec-table td:not(.ec-copy)')].map(n => n.textContent?.replace(' บาท', '').trim());

  it('should split a VAT-inclusive price live', () => {
    type(0, '1,070');
    expect(values()).toEqual(['1,070.000000', '70.000000', '1,000.000000']);
  });

  it('should add VAT in priceExcVat mode', () => {
    [...el.querySelectorAll<HTMLElement>('.wc-chip')].find(b => b.textContent?.includes('priceExcVat'))!.click();
    type(0, '100');
    expect(values()).toEqual(['107.000000', '7.000000', '100.000000']);
    expect(el.querySelector('.vc-highlight .vc-key')?.textContent).toBe('priceIncVat');
  });

  it('should warn on an invalid rate', () => {
    type(1, '-1');
    expect(el.querySelector('.ec-error')).toBeTruthy();
  });
});
