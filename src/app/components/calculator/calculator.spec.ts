import { Clipboard } from '@angular/cdk/clipboard';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';
import { Calculator } from './calculator';

describe('Calculator', () => {
  let fixture: ComponentFixture<Calculator>;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('calculator.text');
    localStorage.removeItem('calculator.decimals');
    await TestBed.configureTestingModule({
      imports: [Calculator],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    }).compileComponents();
    fixture = TestBed.createComponent(Calculator);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('calculator.text');
    localStorage.removeItem('calculator.decimals');
  });

  const type = (text: string) => {
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('should start with an example', () => {
    expect(el.querySelectorAll('.calc-results .calc-result').length).toBeGreaterThan(0);
  });

  it('should show one result per line, the total and keep the notepad', () => {
    type('#RC0001\n100+100/100\n\n2 * 3');
    const results = [...el.querySelectorAll('.calc-results .calc-line')].map(line => line.textContent?.trim());
    expect(results).toEqual(['', '101', '', '6']);
    expect(el.querySelector('.calc-total')?.textContent).toContain('107');
    expect(el.querySelector('.calc-backdrop .calc-header')?.textContent).toBe('#RC0001');
    expect(localStorage.getItem('calculator.text')).toBe('#RC0001\n100+100/100\n\n2 * 3');
  });

  it('should copy a plain number when a result is clicked', () => {
    type('1000 * 1000');
    const copy = spyOn(TestBed.inject(Clipboard), 'copy').and.returnValue(true);
    const result = el.querySelector('.calc-results .calc-result') as HTMLElement;
    expect(result.textContent).toBe('1,000,000');
    result.click();
    expect(copy).toHaveBeenCalledWith('1000000');
  });

  it('should clear the notepad', () => {
    type('1 + 1');
    [...el.querySelectorAll<HTMLElement>('button')].find(b => b.textContent?.trim() === 'Clear')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.calc-results .calc-result').length).toBe(0);
  });

  it('should show a guide whose example results come from the real parser', () => {
    localStorage.removeItem('calculator.guide');
    const rows = [...el.querySelectorAll('.calc-guide tr')];
    const percent = rows.find(row => row.textContent?.includes('a + x%'))!;
    expect(percent.querySelector('.calc-guide-example b')?.textContent).toBe('1,070');
  });

  it('should append a guide example to the notepad', () => {
    type('1 + 1');
    const row = [...el.querySelectorAll('.calc-guide tr')].find(r => r.textContent?.includes('x% of a'))!;
    (row.querySelector('.wc-chip') as HTMLElement).click();
    fixture.detectChanges();
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('1 + 1\n\n20% of 350');
    expect(el.querySelector('.calc-total')?.textContent).toContain('72');
  });

  it('should collapse the guide and remember it', () => {
    (el.querySelector('.calc-guide-toggle') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.calc-guide table')).toBeNull();
    expect(localStorage.getItem('calculator.guide')).toBe('false');
    localStorage.removeItem('calculator.guide');
  });

  it('should round at the calculation precision and show fixed decimals', () => {
    type('a = 10 / 3\na * 3');
    const setting = (label: string, value: string) => {
      const input = el.querySelector(`.calc-settings input[aria-label="${label}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const results = () => [...el.querySelectorAll('.calc-results .calc-result')].map(r => r.textContent);

    setting('ปัดเศษตอนคำนวณ', '2');
    expect(results()).toEqual(['3.33', '9.99']);

    setting('ทศนิยมที่แสดง', '4');
    expect(results()).toEqual(['3.3300', '9.9900']);
    expect(el.querySelector('.calc-total')?.textContent).toContain('13.3200');
    expect(JSON.parse(localStorage.getItem('calculator.decimals')!)).toEqual({ precision: 2, display: 4 });

    setting('ปัดเศษตอนคำนวณ', '');
    expect(results()).toEqual(['3.3333', '10.0000']);
  });
});
