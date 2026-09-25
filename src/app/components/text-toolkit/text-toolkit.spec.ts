import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextToolkit } from './text-toolkit';

describe('TextToolkit', () => {
  let fixture: ComponentFixture<TextToolkit>;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('textToolkit.section');
    await TestBed.configureTestingModule({
      imports: [TextToolkit],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(TextToolkit);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('textToolkit.section'));

  const openTab = (label: string) => {
    [...el.querySelectorAll<HTMLButtonElement>('.tt-tabs button')].find(b => b.textContent?.includes(label))!.click();
    fixture.detectChanges();
  };
  const visible = (selector: string) => !(el.querySelector(selector)!.parentElement as HTMLElement).hidden;

  it('should show JSON Viewer first, without the nested headings', () => {
    expect(visible('app-json-viewer')).toBeTrue();
    expect(visible('app-text-compare')).toBeFalse();
    expect(el.querySelectorAll('h1').length).toBe(1);
  });

  it('should keep text in a pane after switching tabs', () => {
    openTab('Word Counter');
    const textarea = el.querySelector('app-word-counter textarea') as HTMLTextAreaElement;
    textarea.value = 'hello world';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    openTab('Text Compare');
    openTab('Word Counter');
    expect((el.querySelector('app-word-counter textarea') as HTMLTextAreaElement).value).toBe('hello world');
    expect(el.querySelector('app-word-counter .wc-headline')?.textContent).toContain('2 words');
  });

  it('should remember the last tab', () => {
    openTab('Text Compare');
    expect(localStorage.getItem('textToolkit.section')).toBe('compare');
  });

  it('should include Unicode Converter as a tab', () => {
    openTab('Unicode Converter');
    expect(visible('app-unicode-converter')).toBeTrue();
    expect(el.querySelector('app-unicode-converter h1')).toBeNull();
  });

  it('should switch tab when asked by an old link while already open', () => {
    window.dispatchEvent(new CustomEvent('toolkit-section', { detail: { key: 'textToolkit.section', value: 'count' } }));
    fixture.detectChanges();
    expect(visible('app-word-counter')).toBeTrue();
  });
});
