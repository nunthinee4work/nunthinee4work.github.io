import { Component, Input } from '@angular/core';
import { FileUtils } from '../../utils/file.utils';

@Component({
  selector: 'app-download-button',
  templateUrl: './download-button.html',
})
export class DownloadButton {
  @Input() content: string | null | undefined = '';
  /** Base name without extension; a timestamp is appended. */
  @Input() fileName = 'output';
  @Input() extension = 'txt';
  @Input() mimeType = 'text/plain';

  download() {
    if (!this.content) return;
    FileUtils.download(this.content, FileUtils.timestampedName(this.fileName, this.extension), this.mimeType);
  }
}
