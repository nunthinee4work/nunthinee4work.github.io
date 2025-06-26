import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from "../../shared/copy-button/copy-button";

@Component({
  selector: 'app-array-formatter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton
  ],
  templateUrl: './array-formatter.html',
  styleUrl: './array-formatter.scss'
})
export class ArrayFormatter {
  formatterForm!: FormGroup;
  formatterOutput = '';

  constructor(private fb: FormBuilder) {
    this.formatterForm = this.fb.group({
      inputSeparator: ['NEW_LINE'],
      outputSeparator: ['NEW_LINE'],
      outputQuote: ['NO_QUOTE'],
      inputText: ['']
    });
  }

  processFormatter() {
    const {
      inputSeparator,
      outputSeparator,
      outputQuote,
      inputText
    } = this.formatterForm.value;

    const cleanString = inputText.replace(/["']/g, '');
    const lines = inputSeparator === 'NEW_LINE'
      ? cleanString.split('\n').filter((line: any) => line.trim() !== '')
      : cleanString.split(',').map((s: any) => s.trim());

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
      inputText: ''
    });
    this.formatterOutput = '';
  }
}
