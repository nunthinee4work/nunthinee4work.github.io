export class FileUtils {
  /** Triggers a browser download of `content` as a file. */
  static download(content: string, fileName: string, mimeType = 'text/plain') {
    FileUtils.downloadBlob(new Blob([content], { type: `${mimeType};charset=utf-8` }), fileName);
  }

  /** Triggers a browser download of a binary blob (e.g. a resized image). */
  static downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** `payload` + `json` -> `payload-20260923-141502.json` */
  static timestampedName(baseName: string, extension: string, now = new Date()) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      + `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${baseName}-${stamp}.${extension}`;
  }
}
