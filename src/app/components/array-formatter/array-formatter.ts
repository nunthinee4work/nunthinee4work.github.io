import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from "../../shared/copy-button/copy-button";
import { DownloadButton } from '../../shared/download-button/download-button';

@Component({
  selector: 'app-array-formatter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton,
    DownloadButton
  ],
  templateUrl: './array-formatter.html',
  styleUrl: './array-formatter.scss'
})
export class ArrayFormatter {
  formatterForm!: FormGroup;
  formatterOutput = '';
  inputCount = 0;
  outputCount = 0;
  duplicateCount = 0;

  constructor(private fb: FormBuilder) {
    this.formatterForm = this.fb.group({
      inputSeparator: ['NEW_LINE'],
      outputSeparator: ['NEW_LINE'],
      outputQuote: ['NO_QUOTE'],
      trimItems: [true],
      removeDuplicates: [false],
      inputText: ['']
    });
  }

  processFormatter() {
    const {
      inputSeparator,
      outputSeparator,
      outputQuote,
      trimItems,
      removeDuplicates,
      inputText
    } = this.formatterForm.value;

    const cleanString = (inputText ?? '').replace(/["']/g, '');
    const rawItems: string[] = inputSeparator === 'NEW_LINE'
      ? cleanString.split('\n').filter((line: string) => line.trim() !== '')
      : cleanString.split(',').map((s: string) => s.trim());

    const items = trimItems ? rawItems.map(item => item.trim()) : rawItems;
    const lines = removeDuplicates ? [...new Set(items)] : items;

    this.inputCount = items.length;
    this.outputCount = lines.length;
    this.duplicateCount = items.length - lines.length;

    const format = (str: string): string => {
      if (outputQuote === 'DOUBLE_QUOTE') return `"${str}"`;
      if (outputQuote === 'SINGLE_QUOTE') return `'${str}'`;
      return str;
    };

    let result = '';
    if (outputSeparator === 'NEW_LINE') {
      result = lines.map(format).join('\n');
    } else if (outputSeparator === 'COMMA_NEWLINE') {
      result = lines.map(format).join(',\n');
    } else {
      result = lines.map(format).join(',');
    }

    this.formatterOutput = result;
  }

  clearFormatter() {
    this.formatterForm.reset({
      inputSeparator: 'NEW_LINE',
      outputSeparator: 'NEW_LINE',
      outputQuote: 'NO_QUOTE',
      trimItems: true,
      removeDuplicates: false,
      inputText: ''
    });
    this.formatterOutput = '';
    this.inputCount = 0;
    this.outputCount = 0;
    this.duplicateCount = 0;
  }
}
