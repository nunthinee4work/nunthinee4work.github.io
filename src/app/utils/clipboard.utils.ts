export class ClipboardUtils {
  /**
   * Copies `text`, also from inside a Bootstrap modal. The fallback for when the async Clipboard API
   * is unavailable or denied puts its temporary <textarea> next to `anchor` instead of on <body>
   * (what CDK Clipboard does): the modal's focus trap pulls focus back from anything outside it,
   * which drops the selection and makes execCommand('copy') copy nothing.
   */
  static async copy(text: string, anchor?: Element | null): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return ClipboardUtils.copyWithTextarea(text, anchor?.closest('.modal') ?? document.body);
    }
  }

  private static copyWithTextarea(text: string, host: Element): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    const previous = document.activeElement as HTMLElement | null;
    host.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
      previous?.focus?.();
    }
  }
}
