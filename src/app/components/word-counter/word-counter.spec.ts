import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WordCounter } from './word-counter';

describe('WordCounter', () => {
  let fixture: ComponentFixture<WordCounter>;
  let component: WordCounter;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordCounter],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(WordCounter);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const type = (text: string) => {
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const click = (selector: string, text: string) => {
    [...el.querySelectorAll<HTMLElement>(selector)].find(b => b.textContent?.trim() === text)!.click();
    fixture.detectChanges();
  };

  it('should count live as the user types', () => {
    type('split tote again and split tote');
    expect(el.querySelector('.wc-headline')?.textContent).toContain('6 words');
    expect(component.stats.characters).toBe(31);
  });

  it('should show remaining and exceeded characters for a limit preset', () => {
    type('x'.repeat(20));
    click('.wc-chip', '25');
    expect(el.querySelector('.wc-progress-text')?.textContent).toContain('เหลืออีก 5');

    type('x'.repeat(30));
    expect(el.querySelector('.wc-progress-text')?.textContent).toContain('เกินมา 5');
    expect(el.querySelector('textarea')?.classList).toContain('is-invalid');
  });

  it('should switch keyword density to two-word phrases', () => {
    type('split tote then split tote again');
    click('.wc-card-head button', '2');
    expect(el.querySelector('.wc-keyword')?.textContent).toBe('split tote');
  });

  it('should clear the text', () => {
    type('hello');
    click('.btn-danger', 'Clear');
    expect(component.stats.words).toBe(0);
  });
});
