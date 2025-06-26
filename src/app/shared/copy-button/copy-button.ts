import { Component, Input } from '@angular/core';
import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-copy-button',
  imports: [CommonModule, ClipboardModule],
  templateUrl: './copy-button.html',
  styleUrl: './copy-button.scss'
})
export class CopyButton {
  @Input() textToCopy = '';
  @Input() showIconOnly = false;
  isCopied = false;

  constructor(private clipboard: Clipboard) { }

  copy(event: Event) {
    const button = event.target as HTMLButtonElement;
    if (!button) return;

    this.clipboard.copy(this.textToCopy);

    this.isCopied = true

    setTimeout(() => {
      this.isCopied = false
    }, 2000);
  }
}
