import { Injectable, signal } from '@angular/core';
import { JsonPath, JsonUtils } from '../../utils/json.utils';

/** Shared state for one grid tree: selection, search term and expand/collapse-all. Provided by JsonViewer. */
@Injectable()
export class JsonGridContext {
  readonly selectedKey = signal<string | null>(null);
  readonly search = signal('');
  /** Bumped by Expand all / Collapse all; nodes follow it until the user toggles them again. */
  readonly bulk = signal<{ version: number; expanded: boolean } | null>(null);
  /** Nodes deeper than this start collapsed. */
  readonly defaultDepth = 3;

  /** Set by the viewer: jump the editor to this path (GridSync). */
  onSelect: (path: JsonPath) => void = () => { };

  select(path: JsonPath) {
    this.selectedKey.set(JsonUtils.pathKey(path));
    this.onSelect(path);
  }

  isSelected(path: JsonPath) {
    return this.selectedKey() === JsonUtils.pathKey(path);
  }

  matches(value: unknown) {
    const term = this.search().trim().toLowerCase();
    return !!term && value !== null && typeof value !== 'object' && String(value).toLowerCase().includes(term);
  }

  setAll(expanded: boolean) {
    this.bulk.set({ version: (this.bulk()?.version ?? 0) + 1, expanded });
  }
}
