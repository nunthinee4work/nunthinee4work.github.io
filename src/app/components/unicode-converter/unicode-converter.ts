import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';

@Component({
  selector: 'app-unicode-converter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton
  ],
  templateUrl: './unicode-converter.html',
  styleUrl: './unicode-converter.scss'
})
export class UnicodeConverter {
  form!: FormGroup;
  unicodeOutput = '';
  copied = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      inputUnicode: ['']
    });
  }

  processUnicodeConverter(): void {
    const properties: Record<string, string> = {};
    const inputUnicode = this.form.get('inputUnicode')?.value || '';
    const lines = inputUnicode.split('\n');
    const keyValuePattern = /^\s*(\S+)\s*=\s*(.*)$/;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const match = keyValuePattern.exec(line);
      if (match) {
        const key = match[1];
        let value = match[2].trim();

        while (value.endsWith('\\')) {
          i++;
          if (i < lines.length) {
            const nextLine = lines[i].trim();
            if (nextLine) {
              value += nextLine;
            }
          } else {
            break;
          }
        }

        const decodedValue = value
          .replace(/\\u([0-9A-Fa-f]{4})/g, (_, grp) =>
            String.fromCharCode(parseInt(grp, 16))
          )
          .replace(/\\/g, '');

        properties[key] = decodedValue;
      }
      i++;
    }

    this.unicodeOutput = Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  clearDataUnicode(): void {
    this.form.reset();
    this.unicodeOutput = '';
    this.copied = false;
  }
}
