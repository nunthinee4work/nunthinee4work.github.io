import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonEditor } from './json-editor';

@Component({
  imports: [JsonEditor, ReactiveFormsModule],
  template: `<app-json-editor [formControl]="control" [list]="true" itemLabel="delivery order"
    (valueChange)="changes = changes + 1"></app-json-editor>`,
})
class Host {
  control = new FormControl('');
  changes = 0;
}

describe('JsonEditor', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()]
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const textarea = el.querySelector('textarea')!;
    const type = (text: string) => {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, el, textarea, type, host: fixture.componentInstance };
  };

  it('should render one line number per line and update the form control', () => {
    const { el, type, host } = setup();
    type('{\n  "a": 1\n}');

    expect(el.querySelectorAll('.json-editor-gutter div').length).toBe(3);
    expect(host.control.value).toBe('{\n  "a": 1\n}');
    expect(host.changes).toBe(1);
    expect(el.querySelector('.json-editor-ok')?.textContent).toContain('1 delivery order');
  });

  it('should show values written by the form', () => {
    const { el, textarea, fixture, host } = setup();
    host.control.setValue('{"a":1},\n{"a":2}');
    fixture.detectChanges();

    expect(textarea.value).toBe('{"a":1},\n{"a":2}');
    expect(el.querySelector('.json-editor-ok')?.textContent).toContain('2 delivery orders');
  });

  it('should mark the error line in the gutter and jump to it', () => {
    const { el, textarea, type } = setup();
    type('{\n  "a": 1,\n  b: 2\n}');

    expect(el.querySelector('.json-editor-gutter .error')?.textContent?.trim()).toBe('3');
    expect(el.querySelector('.json-editor-error')?.textContent).toContain('Line 3, Col 3');

    (el.querySelector('.json-editor-goto') as HTMLButtonElement).click();
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe('{\n  "a": 1,\n  '.length);
  });

  it('should pretty-print valid JSON keeping the comma-separated shape', () => {
    const { textarea, host, el, fixture } = setup();
    textarea.value = '{"a":1},{"b":ObjectId("x")}';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('.json-editor-tool') as HTMLButtonElement).click();
    expect(host.control.value).toBe('{\n  "a": 1\n},\n{\n  "b": "x"\n}');
    expect(host.changes).toBe(2);
  });

  it('should disable Format while JSON is invalid', () => {
    const { el, type } = setup();
    type('{ bad }');
    expect((el.querySelector('.json-editor-tool') as HTMLButtonElement).disabled).toBeTrue();
  });
});
