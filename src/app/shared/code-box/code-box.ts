import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-code-box',
  imports: [
    CommonModule,
    ClipboardModule
  ],
  templateUrl: './code-box.html',
  styleUrl: './code-box.scss'
})
export class CodeBox {
  @Input() codeText: string = '';
  copied = false;

  constructor(private clipboard: Clipboard) { }

  copyToClipboard(): void {
    const textToCopy = typeof this.codeText === 'string'
      ? this.codeText
      : JSON.stringify(this.codeText, null, 2);

    const success = this.clipboard.copy(textToCopy);
    if (success) {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    }
  }

  formatCodeText(code: any): string {
    return typeof code === 'string'
      ? code
      : JSON.stringify(code, null, 2);
  }
}
