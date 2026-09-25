import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListTools } from './list-tools';

describe('ListTools', () => {
  let fixture: ComponentFixture<ListTools>;
  let component: ListTools;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('listFormatter.section');
    await TestBed.configureTestingModule({
      imports: [ListTools],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(ListTools);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const type = (text: string) => {
    const input = el.querySelector('#lt-input') as HTMLTextAreaElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const choose = (name: string, value?: string) => {
    const selector = value ? `input[formcontrolname="${name}"][value="${value}"]` : `input[formcontrolname="${name}"]`;
    (el.querySelector(selector) as HTMLInputElement).click();
    fixture.detectChanges();
  };
  const sort = (label: string) => {
    [...el.querySelectorAll<HTMLButtonElement>('.lt-sort button')].find(b => b.textContent?.includes(label))!.click();
    fixture.detectChanges();
  };
  const output = () => (el.querySelector('.lt-output') as HTMLTextAreaElement).value;

  it('should update the output live', () => {
    type('b\na');
    expect(output()).toBe('b\na');
    sort('A → Z');
    expect(output()).toBe('a\nb');
  });

  it('should sort Thai and quote for SQL in one go', () => {
    type('ข้าว\nกล้วย\nข้าว');
    sort('A → Z');
    choose('removeDuplicates');
    choose('quote', 'SINGLE_QUOTE');
    choose('outputSeparator', 'COMMA_SPACE');
    expect(output()).toBe("'กล้วย', 'ข้าว'");
    expect(el.querySelector('.result-stats')?.textContent).toContain('1');
  });

  it('should reuse output as input and clear back to defaults', () => {
    type('a,b');
    component.useOutput();
    fixture.detectChanges();
    expect(component.form.getRawValue()['text']).toBe('a\nb');

    sort('Z → A');
    component.clear();
    fixture.detectChanges();
    expect(component.form.getRawValue()['sort']).toBe('NONE');
    expect(output()).toBe('');
  });

  describe('Count Duplicates tab', () => {
    const openCount = () => {
      [...el.querySelectorAll<HTMLButtonElement>('.tt-tabs button')].find(b => b.textContent?.includes('Count'))!.click();
      fixture.detectChanges();
    };

    afterEach(() => localStorage.removeItem('listFormatter.section'));

    it('should count lines from the shared input', () => {
      type('apple\nbanana\napple');
      openCount();
      const rows = [...el.querySelectorAll('.lt-count-table tbody tr')].map(tr => [...tr.children].map(td => td.textContent?.trim()));
      expect(rows).toEqual([['apple', '2'], ['banana', '1']]);
      expect(el.querySelector('.result-stats')?.textContent).toContain('Unique values 2');
      expect(component.countOutput).toBe('apple (2)\nbanana (1)');
    });

    it('should list only duplicates as TAB for Excel', () => {
      openCount();
      type('a\nb\na');
      // [value]="true" is a property binding, so pick the second radio of the group
      (el.querySelectorAll('input[formcontrolname="duplicatesOnly"]')[1] as HTMLInputElement).click();
      fixture.detectChanges();
      choose('countFormat', 'TAB');
      expect(component.countOutput).toBe('Value\tCount\na\t2');
      expect(component.countExtension).toBe('tsv');
    });

    it('should restore the input after Clear', () => {
      openCount();
      type('x\nx');
      [...el.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === 'Clear')!.click();
      fixture.detectChanges();
      expect(component.counts.totalLines).toBe(0);

      [...el.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes('Restore input'))!.click();
      fixture.detectChanges();
      expect(component.counts.rows).toEqual([{ value: 'x', count: 2 }]);
    });
  });
});
