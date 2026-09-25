import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DownloadButton } from '../download-button/download-button';

@Component({
  selector: 'app-code-box',
  imports: [
    CommonModule,
    ClipboardModule,
    DownloadButton
  ],
  templateUrl: './code-box.html',
  styleUrl: './code-box.scss'
})
export class CodeBox {
  @Input() codeText: string = '';
  /** When set, shows a Download button saving the content as `<fileName>-<timestamp>.<extension>`. */
  @Input() fileName = '';
  @Input() extension = 'txt';
  @Input() mimeType = 'text/plain';
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
