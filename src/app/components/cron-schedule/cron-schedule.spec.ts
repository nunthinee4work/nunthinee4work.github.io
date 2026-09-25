import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CronSchedule } from './cron-schedule';

describe('CronSchedule', () => {
  let fixture: ComponentFixture<CronSchedule>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CronSchedule],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(CronSchedule);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const type = (value: string) => {
    const input = el.querySelector('.cr-input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return input;
  };

  it('should describe the expression and list 5 next runs', () => {
    type('0 9 * * 1-5');
    expect(el.querySelector('.cr-description')?.textContent).toContain('At 09:00 on every day-of-week from Monday through Friday.');
    expect(el.querySelectorAll('.cr-runs li').length).toBe(5);
  });

  it('should highlight the invalid field', () => {
    type('0 25 * * *');
    expect(el.querySelector('.cr-description')?.classList).toContain('cr-invalid');
    expect(el.querySelector('.cr-legend-item.cr-invalid .cr-legend-label')?.textContent).toBe('hour');
  });

  it('should highlight the field under the cursor', () => {
    const input = type('5 4 * * sun');
    input.setSelectionRange(2, 2);
    input.dispatchEvent(new Event('keyup'));
    fixture.detectChanges();
    expect(el.querySelector('.cr-legend-item.active .cr-legend-label')?.textContent).toBe('hour');
  });

  it('should load an example and show 6 fields for Spring expressions', () => {
    const spring = [...el.querySelectorAll<HTMLButtonElement>('.cr-example')].find(b => b.textContent?.includes('Spring'))!;
    spring.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.cr-legend-item').length).toBe(6);
    expect(el.querySelector('.cr-description')?.textContent).toContain('every 15th minute');
  });
});
