import { Component, Input, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { JsonEditor } from '../../shared/json-editor/json-editor';
import { JsonLocation, JsonPath, JsonUtils } from '../../utils/json.utils';
import { JsonGridContext } from './json-grid-context';
import { JsonGridNode } from './json-grid-node';

// Dummy data only — never real orders/customers
const SAMPLE = {
  shipmentNo: 'SH-0001',
  store: { code: 'STORE-001', name: 'Sample Store', active: true },
  deliveryOrders: [
    {
      doNo: 'DO-0001',
      pickDate: '2026-09-23',
      items: [
        { barcode: '1111111111111', productName: 'Sample Product A', qty: 2, unit: 'EA' },
        { barcode: '2222222222222', productName: 'Sample Product B', qty: 1, unit: 'PK', note: null },
      ],
    },
    {
      doNo: 'DO-0002',
      pickDate: '2026-09-24',
      items: [{ barcode: '3333333333333', productName: 'Sample Product C', qty: 6, unit: 'EA' }],
    },
  ],
  tags: ['cross-dock', 'priority'],
};

@Component({
  selector: 'app-json-viewer',
  imports: [ReactiveFormsModule, JsonEditor, JsonGridNode, CopyButton],
  templateUrl: './json-viewer.html',
  styleUrl: './json-viewer.scss',
  providers: [JsonGridContext],
})
export class JsonViewer {
  /** Rendered inside Text Toolkit's tabs: the page already has a heading */
  @Input() embedded = false;

  @ViewChild(JsonEditor) editor?: JsonEditor;

  readonly ctx = inject(JsonGridContext);
  readonly control = new FormControl('');

  view: 'split' | 'tab' = 'split';
  activePane: 'json' | 'grid' = 'json';

  parsed: unknown = undefined;
  hasData = false;
  /** Grid shows the last valid JSON while the text is being edited into an invalid state */
  stale = false;
  selectedPath: JsonPath | null = null;
  matchCount = 0;

  private locations = new Map<string, JsonLocation>();
  private matchOffsets: { start: number; end: number }[] = [];
  private matchIndex = -1;

  constructor() {
    this.ctx.onSelect = path => this.syncEditorTo(path);
  }

  get selectedLabel() {
    return this.selectedPath ? JsonUtils.pathLabel(this.selectedPath) : '';
  }

  onTextChange(text: string) {
    if (!text.trim()) {
      this.parsed = undefined;
      this.hasData = false;
      this.stale = false;
      this.locations.clear();
      this.updateMatches();
      return;
    }
    try {
      // Mongo shell helpers are replaced length-for-length, so locations still match the visible text
      const { value, locations } = JsonUtils.parseWithLocations(JsonUtils.normalizeMongoShell(text));
      this.parsed = value;
      this.locations = locations;
      this.hasData = true;
      this.stale = false;
    } catch {
      this.stale = this.hasData;
    }
    this.updateMatches();
  }

  loadSample() {
    this.control.setValue(JSON.stringify(SAMPLE, null, 2));
    this.onTextChange(this.control.value ?? '');
  }

  format() {
    this.editor?.format();
  }

  minify() {
    this.editor?.minify();
  }

  validate() {
    this.editor?.gotoError();
  }

  clear() {
    this.control.setValue('');
    this.selectedPath = null;
    this.ctx.selectedKey.set(null);
    this.onTextChange('');
  }

  expandAll(expanded: boolean) {
    this.ctx.setAll(expanded);
  }

  setView(view: 'split' | 'tab') {
    this.view = view;
  }

  onSearch(term: string) {
    this.ctx.search.set(term);
    this.updateMatches();
  }

  /** Enter in the search box: select the next match in the editor. */
  nextMatch(step = 1) {
    if (!this.matchOffsets.length) return;
    this.matchIndex = (this.matchIndex + step + this.matchOffsets.length) % this.matchOffsets.length;
    const { start, end } = this.matchOffsets[this.matchIndex];
    if (this.view === 'tab') this.activePane = 'json';
    // Let the JSON pane render before selecting when switching tabs
    setTimeout(() => this.editor?.select(start, end));
  }

  get matchPosition() {
    return this.matchIndex >= 0 && this.matchCount ? `${this.matchIndex + 1}/${this.matchCount}` : `${this.matchCount}`;
  }

  private syncEditorTo(path: JsonPath) {
    this.selectedPath = path;
    const location = this.locations.get(JsonUtils.pathKey(path));
    if (!location || this.stale || this.view === 'tab') return;
    this.editor?.select(location.keyStart ?? location.start, location.end);
  }

  /** Every primitive value / property name that contains the search term, in text order. */
  private updateMatches() {
    const term = this.ctx.search().trim().toLowerCase();
    this.matchOffsets = [];
    this.matchIndex = -1;
    if (term && this.hasData) {
      const walk = (value: unknown, path: JsonPath) => {
        const location = this.locations.get(JsonUtils.pathKey(path));
        const key = path[path.length - 1];
        if (location && typeof key === 'string' && key.toLowerCase().includes(term) && location.keyStart !== undefined) {
          this.matchOffsets.push({ start: location.keyStart, end: location.keyStart + JSON.stringify(key).length });
        }
        if (value !== null && typeof value === 'object') {
          Object.entries(value).forEach(([childKey, child]) =>
            walk(child, [...path, Array.isArray(value) ? Number(childKey) : childKey]));
        } else if (location && String(value).toLowerCase().includes(term)) {
          this.matchOffsets.push({ start: location.start, end: location.end });
        }
      };
      walk(this.parsed, []);
      this.matchOffsets.sort((a, b) => a.start - b.start);
    }
    this.matchCount = this.matchOffsets.length;
  }
}
