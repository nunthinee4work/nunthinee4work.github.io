import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonViewer } from './json-viewer';

describe('JsonViewer', () => {
  let fixture: ComponentFixture<JsonViewer>;
  let component: JsonViewer;
  let el: HTMLElement;

  const type = (text: string) => {
    const textarea = el.querySelector('.json-editor textarea') as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return textarea;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonViewer],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(JsonViewer);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should render arrays of objects as a table with a column per key', () => {
    type('[{"a":1,"b":"x"},{"a":2,"c":true}]');
    const headers = [...el.querySelectorAll('.jg-grid thead th')].map(th => th.textContent?.trim());
    expect(headers).toEqual(['#', 'a', 'b', 'c']);
    expect(el.querySelectorAll('.jg-grid tbody tr').length).toBe(2);
    expect(el.querySelectorAll('.jg-missing').length).toBe(2);
  });

  it('should select the matching text in the editor when a grid value is clicked', () => {
    const textarea = type('{\n  "doNo": "DO-1",\n  "qty": 5\n}');
    const qty = [...el.querySelectorAll('.jg-number')].find(n => n.textContent?.trim() === '5') as HTMLElement;
    qty.click();
    fixture.detectChanges();

    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('"qty": 5');
    expect(el.querySelector('.jv-path')?.textContent).toBe('$.qty');
  });

  it('should keep the last valid grid while JSON is invalid', () => {
    type('{"a":1}');
    type('{"a":1');
    expect(component.stale).toBeTrue();
    expect(el.querySelector('.jv-grid.is-stale')).toBeTruthy();
    expect(el.querySelector('.jg-number')?.textContent?.trim()).toBe('1');
  });

  it('should count and cycle search matches across keys and values', () => {
    type('{"name":"alpha","items":[{"name":"beta"}]}');
    component.onSearch('name');
    fixture.detectChanges();
    expect(component.matchCount).toBe(2);

    // keys "name" x2 + values "alpha", "beta"
    component.onSearch('a');
    expect(component.matchCount).toBe(4);
  });

  it('should accept mongo shell helpers', () => {
    type('{"_id": ObjectId("abc"), "d": ISODate("2026-09-23T00:00:00Z")}');
    expect(component.hasData).toBeTrue();
    expect(el.querySelector('.jg-string')?.textContent?.trim()).toBe('abc');
  });

  it('should collapse and expand everything', () => {
    type('{"a":{"b":{"c":1}}}');
    component.expandAll(false);
    fixture.detectChanges();
    expect(el.querySelectorAll('.jg-table').length).toBe(0);

    component.expandAll(true);
    fixture.detectChanges();
    expect(el.querySelectorAll('.jg-table').length).toBe(3);
  });

  it('should load the sample and clear it', () => {
    component.loadSample();
    fixture.detectChanges();
    expect(component.hasData).toBeTrue();

    component.clear();
    fixture.detectChanges();
    expect(component.hasData).toBeFalse();
    expect(el.querySelector('.jv-empty')).toBeTruthy();
  });
});
