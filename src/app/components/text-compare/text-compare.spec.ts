import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextCompare } from './text-compare';

describe('TextCompare', () => {
  let fixture: ComponentFixture<TextCompare>;
  let component: TextCompare;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextCompare],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(TextCompare);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  // Drive through the DOM like a user does; zoneless CD only refreshes on events
  const type = (id: string, text: string) => {
    const textarea = el.querySelector(`#${id}`) as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
  };
  const setTexts = (left: string, right: string) => {
    type('tc-left', left);
    type('tc-right', right);
    fixture.detectChanges();
  };
  const click = (selector: string, text?: string) => {
    const button = [...el.querySelectorAll<HTMLElement>(selector)].find(b => !text || b.textContent?.includes(text))!;
    button.click();
    fixture.detectChanges();
  };

  it('should diff in real time and show removal / addition counts', () => {
    setTexts('a\nb\nc', 'a\nB\nc\nd');
    const stats = [...el.querySelectorAll('.tc-stat')].map(s => s.textContent?.trim());
    expect(stats).toEqual(['− 1 removal', '+ 2 additions']);
    expect(el.querySelectorAll('.tc-split .tc-modify').length).toBe(1);
  });

  it('should only diff on demand when real-time is off', () => {
    click('.tc-options input[formcontrolname="realtime"]');
    setTexts('a', 'b');
    expect(component.result).toBeNull();

    click('.tc-actions .btn-primary');
    expect(component.result?.removals).toBe(1);
    expect(el.querySelector('.tc-stat-removed')).toBeTruthy();
  });

  it('should report identical text with line and character counts', () => {
    setTexts('same\ntext', 'same\ntext');
    const card = el.querySelector('.tc-identical')!;
    expect(card.classList).not.toContain('tc-identical-soft');
    expect(card.textContent).toContain('2 บรรทัด');
    expect(card.textContent).toContain('9 ตัวอักษร');
    expect(el.querySelector('.tc-table')).toBeNull();
  });

  it('should say when text only matches because of ignore options, and reveal the diff', () => {
    click('.tc-options input[formcontrolname="ignoreCase"]');
    setTexts('Hello', 'hello');
    const card = el.querySelector('.tc-identical')!;
    expect(card.classList).toContain('tc-identical-soft');
    expect(card.textContent).toContain('ตัวพิมพ์เล็ก/ใหญ่');

    click('.tc-identical button');
    expect(component.result?.identical).toBeFalse();
    expect(el.querySelector('.tc-table')).toBeTruthy();
  });

  it('should fold long unchanged runs and expand them on click', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`);
    const changed = [...lines];
    changed[10] = 'changed';
    setTexts(lines.join('\n'), changed.join('\n'));

    const folds = el.querySelectorAll('.tc-fold');
    expect(folds.length).toBe(2);
    expect(folds[0].textContent).toContain('7 unchanged lines');

    (folds[0].querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.tc-fold').length).toBe(1);
  });

  it('should render removed and added lines separately in unified view', () => {
    setTexts('x', 'y');
    click('.jv-view-switch button', 'Unified');
    expect(el.querySelectorAll('.tc-unified .tc-delete').length).toBe(1);
    expect(el.querySelectorAll('.tc-unified .tc-insert').length).toBe(1);
  });

  it('should swap sides', () => {
    setTexts('left', 'right');
    click('.tc-swap');
    expect(component.form.getRawValue().left).toBe('right');
    expect(component.form.getRawValue().right).toBe('left');
  });

  it('should respect ignore case', () => {
    setTexts('Hello', 'hello');
    expect(component.result?.identical).toBeFalse();
    component.form.patchValue({ ignoreCase: true });
    expect(component.result?.identical).toBeTrue();
  });

  it('should format both sides as JSON and then show only real differences', () => {
    setTexts('{"b":1,"a":{"x":2}}', '{"b":1,"a":{"x":3}}');
    click('.tc-actions .btn-secondary', 'Format JSON');

    expect(component.form.getRawValue().left).toBe('{\n  "b": 1,\n  "a": {\n    "x": 2\n  }\n}');
    expect(component.result?.removals).toBe(1);
    expect(component.result?.additions).toBe(1);
  });

  it('should ignore key order when Sort JSON keys is on', () => {
    click('.tc-options input[formcontrolname="sortKeys"]');
    setTexts('{"a":1,"b":2}', '{"b":2,"a":1}');
    click('.tc-actions .btn-secondary', 'Format JSON');
    expect(component.result?.identical).toBeTrue();
  });

  it('should keep invalid JSON untouched and show where it is broken', () => {
    setTexts('{"a":1}', '{\n  "a": }');
    click('.tc-input-head button', 'Format JSON'); // left side only
    click('.tc-input:last-of-type .tc-input-head button');

    expect(component.form.getRawValue().left).toBe('{\n  "a": 1\n}');
    expect(component.form.getRawValue().right).toBe('{\n  "a": }');
    expect(el.querySelector('.tc-json-error')?.textContent).toContain('line 2');
  });
});
