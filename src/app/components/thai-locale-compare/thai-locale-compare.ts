import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';

@Component({
  selector: 'app-thai-locale-compare',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton
  ],
  templateUrl: './thai-locale-compare.html',
  styleUrl: './thai-locale-compare.scss'
})
export class ThaiLocaleCompare {
  form!: FormGroup;
  sortResult: string[] = [];
  isAsc = false;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      inputText: [''],
      inputSeparator: ['NEW_LINE'],
      outputSeparator: ['NEW_LINE']
    });
  }

  sortText(): void {
    const { inputText, inputSeparator } = this.form.value;
    const separator = inputSeparator === 'NEW_LINE' ? /\r?\n/ : ',';

    const inputArray = inputText
      .split(separator)
      .map((s: string) => s.trim())
      .filter((s: string) => s);

    this.sortResult = inputArray.sort((a: any, b: any) => this.thaiLocaleCompare(a, b, this.isAsc));
  }

  toggleSortOrder(): void {
    this.isAsc = !this.isAsc;
    this.sortText();
  }

  clearDataSorting(): void {
    this.form.patchValue({ inputText: '' });
    this.sortResult = [];
  }

  get sortedOutput(): string {
    const outputSeparator = this.form.value.outputSeparator;
    return this.sortResult.join(outputSeparator === 'COMMA' ? ', ' : '\n');
  }

  private thaiLocaleCompare(s1: string, s2: string, ascending = true): number {
    const collator = new Intl.Collator('th-TH');

    const isS1English = /^[A-Za-z]/.test(s1);
    const isS2English = /^[A-Za-z]/.test(s2);

    if (isS1English && !isS2English) return ascending ? -1 : 1;
    if (!isS1English && isS2English) return ascending ? 1 : -1;

    const comparison = collator.compare(this.getThaiComparisonString(s1), this.getThaiComparisonString(s2));
    return ascending ? comparison : -comparison;
  }

  private getThaiComparisonString(text: string): string {
    // ตัดช่องว่าง และแปลงให้เป็นตัวพิมพ์เล็ก
    return text.trim().toLowerCase();
  }
}
