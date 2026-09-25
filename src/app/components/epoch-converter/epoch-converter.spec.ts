import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EpochConverter } from './epoch-converter';

describe('EpochConverter', () => {
  let fixture: ComponentFixture<EpochConverter>;
  let component: EpochConverter;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('timeToolkit.section');
    await TestBed.configureTestingModule({
      imports: [EpochConverter],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(EpochConverter);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  const openTab = (label: string) => {
    [...el.querySelectorAll<HTMLButtonElement>('.tt-tabs button')].find(b => b.textContent?.includes(label))!.click();
    fixture.detectChanges();
  };

  const setInput = (name: string, value: string) => {
    const input = el.querySelector(`[formcontrolname="${name}"]`) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
    fixture.detectChanges();
  };

  it('should show the date for a timestamp in UTC and Bangkok', () => {
    setInput('timestamp', '1790147109');
    const text = el.querySelector('.ec-card-wide')?.textContent ?? '';
    expect(text).toContain('seconds');
    expect(text).toContain('2026-09-23T07:05:09.000Z');
    expect(text).toContain('14:05:09');
  });

  it('should explain an ObjectId input', () => {
    setInput('timestamp', '6ab378f77878c679bbdff386');
    expect(el.querySelector('.ec-hint')?.textContent).toContain('ObjectId');
  });

  it('should convert a Bangkok date to epoch seconds', () => {
    setInput('dateZone', 'bangkok');
    setInput('dateTime', '2026-09-23T14:05:09');
    expect(component.dateResult?.getTime()).toBe(1790147109000);
  });

  it('should convert 1800 seconds to 30 minutes', () => {
    openTab('Duration');
    setInput('duration', '1800');
    setInput('durationUnit', 's');
    const summary = [...el.querySelectorAll('.ec-duration')].map(p => p.textContent).join(' ');
    expect(summary).toContain('1,800 seconds = 30 minutes');
    const minutes = [...el.querySelectorAll('.ec-table tr')].find(tr => tr.querySelector('th')?.textContent === 'minutes');
    expect(minutes?.querySelector('td')?.textContent?.trim()).toBe('30');
  });

  it('should convert several lines in batch', () => {
    setInput('batch', '1790147109\nnot-a-time');
    expect(component.batchRows.map(r => r.ok)).toEqual([true, false]);
  });

  it('should count hours between two times, overnight and with a break', () => {
    openTab('Duration');
    setInput('fromTime', '13:30');
    setInput('toTime', '15:00');
    expect(el.querySelector('.ec-duration')?.textContent).toContain('1:30 PM → 3:00 PM = 1 hour 30 minutes');
    expect(component.timeSpan?.hours).toBe('1.5');

    setInput('fromTime', '22:00');
    setInput('toTime', '06:00');
    setInput('breakMinutes', '30');
    expect(component.timeSpan?.overnight).toBeTrue();
    expect(component.timeSpan?.hours).toBe('7.5');
  });

  it('should show Cron Schedule as a tab and remember the last tab', () => {
    openTab('Cron Schedule');
    expect(el.querySelector('app-cron-schedule .cr-description')).toBeTruthy();
    expect(el.querySelector('app-cron-schedule h1')).toBeNull();
    expect(localStorage.getItem('timeToolkit.section')).toBe('cron');
    localStorage.removeItem('timeToolkit.section');
  });
});
