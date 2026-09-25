import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArrayFormatter } from './array-formatter';

describe('ArrayFormatter', () => {
  let component: ArrayFormatter;
  let fixture: ComponentFixture<ArrayFormatter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArrayFormatter],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArrayFormatter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should trim items and keep duplicates by default', () => {
    component.formatterForm.patchValue({ inputText: ' a \nb\n\na ', outputSeparator: 'COMMA' });
    component.processFormatter();
    expect(component.formatterOutput).toBe('a,b,a');
    expect(component.inputCount).toBe(3);
    expect(component.outputCount).toBe(3);
  });

  it('should remove duplicates and report how many were removed', () => {
    component.formatterForm.patchValue({
      inputText: 'a\nb\na\nb\nc',
      outputSeparator: 'COMMA',
      outputQuote: 'SINGLE_QUOTE',
      removeDuplicates: true
    });
    component.processFormatter();
    expect(component.formatterOutput).toBe("'a','b','c'");
    expect(component.inputCount).toBe(5);
    expect(component.outputCount).toBe(3);
    expect(component.duplicateCount).toBe(2);
  });

  it('should keep surrounding spaces when trim is off', () => {
    component.formatterForm.patchValue({ inputText: ' a \nb', trimItems: false });
    component.processFormatter();
    expect(component.formatterOutput).toBe(' a \nb');
  });

  it('should reset counts on clear', () => {
    component.formatterForm.patchValue({ inputText: 'a\na', removeDuplicates: true });
    component.processFormatter();
    component.clearFormatter();
    expect(component.formatterOutput).toBe('');
    expect(component.duplicateCount).toBe(0);
    expect(component.formatterForm.value.trimItems).toBeTrue();
  });
});
