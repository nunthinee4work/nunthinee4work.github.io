import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';
import { CalcToolkit } from './calc-toolkit';

describe('CalcToolkit', () => {
  let fixture: ComponentFixture<CalcToolkit>;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem(CalcToolkit.SECTION_KEY);
    await TestBed.configureTestingModule({
      imports: [CalcToolkit],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    }).compileComponents();
    fixture = TestBed.createComponent(CalcToolkit);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem(CalcToolkit.SECTION_KEY));

  const tab = (label: string) => {
    [...el.querySelectorAll<HTMLElement>('.tt-tabs button')].find(b => b.textContent?.trim() === label)!.click();
    fixture.detectChanges();
  };

  it('should open on Calculator, hide the embedded headings and remember the tab', () => {
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect((el.querySelector('app-calculator')!.parentElement as HTMLElement).hidden).toBeFalse();
    tab('VAT');
    expect((el.querySelector('app-vat-calculator')!.parentElement as HTMLElement).hidden).toBeFalse();
    expect(localStorage.getItem(CalcToolkit.SECTION_KEY)).toBe('vat');
  });

  it('should switch tab when an old #vatCalculator link asks for it', () => {
    window.dispatchEvent(new CustomEvent('toolkit-section', { detail: { key: CalcToolkit.SECTION_KEY, value: 'vat' } }));
    fixture.detectChanges();
    expect((el.querySelector('app-vat-calculator')!.parentElement as HTMLElement).hidden).toBeFalse();
  });
});
