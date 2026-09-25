import { Component, HostListener } from '@angular/core';
import { JsonViewer } from '../json-viewer/json-viewer';
import { TextCompare } from '../text-compare/text-compare';
import { UnicodeConverter } from '../unicode-converter/unicode-converter';
import { WordCounter } from '../word-counter/word-counter';

type Section = 'json' | 'compare' | 'count' | 'unicode';

/** JSON Viewer, Text Compare, Word Counter and Unicode Converter as tabs. Panes stay mounted so pasted text survives tab switches. */
@Component({
  selector: 'app-text-toolkit',
  imports: [JsonViewer, TextCompare, WordCounter, UnicodeConverter],
  templateUrl: './text-toolkit.html',
  styleUrl: './text-toolkit.scss',
})
export class TextToolkit {
  /** Also written by App when an old #jsonViewer / #textCompare / #wordCounter / #unicodeConverter link is opened */
  static readonly SECTION_KEY = 'textToolkit.section';

  readonly sections: { id: Section; label: string; icon: string }[] = [
    { id: 'json', label: 'JSON Viewer', icon: 'fa-table-cells' },
    { id: 'compare', label: 'Text Compare', icon: 'fa-code-compare' },
    { id: 'count', label: 'Word Counter', icon: 'fa-spell-check' },
    { id: 'unicode', label: 'Unicode Converter', icon: 'fa-font' },
  ];

  section: Section = TextToolkit.readSection();

  /** Old tool links (e.g. #cronSchedule) opened while this toolkit is already showing */
  @HostListener('window:toolkit-section', ['$event'])
  onSectionRequest(event: Event) {
    const { key, value } = (event as CustomEvent<{ key: string; value: string }>).detail ?? {};
    if (key === TextToolkit.SECTION_KEY && (['json', 'compare', 'count', 'unicode'] as string[]).includes(value)) {
      this.setSection(value as typeof this.section);
    }
  }

  setSection(section: Section) {
    this.section = section;
    try {
      localStorage.setItem(TextToolkit.SECTION_KEY, section);
    } catch {
      // storage unavailable — the tab just won't be remembered
    }
  }

  private static readSection(): Section {
    try {
      const saved = localStorage.getItem(TextToolkit.SECTION_KEY);
      return saved === 'compare' || saved === 'count' || saved === 'unicode' ? saved : 'json';
    } catch {
      return 'json';
    }
  }
}
