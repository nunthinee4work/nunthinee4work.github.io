import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FileUtils } from '../../utils/file.utils';
import { JsonPath, JsonUtils } from '../../utils/json.utils';
import { JsonGridContext } from './json-grid-context';

type Kind = 'object' | 'array' | 'primitive';

interface Entry {
  key: string | number;
  value: unknown;
  path: JsonPath;
}

interface TableRow {
  index: number;
  path: JsonPath;
  cells: { has: boolean; value: unknown; path: JsonPath }[];
}

/** One value in the grid: primitives inline, objects as key/value tables, arrays of objects as real tables. */
@Component({
  selector: 'app-json-grid-node',
  templateUrl: './json-grid-node.html',
})
export class JsonGridNode implements OnChanges {
  @Input({ required: true }) value: unknown;
  @Input() path: JsonPath = [];
  @Input() depth = 0;

  readonly ctx = inject(JsonGridContext);

  kind: Kind = 'primitive';
  entries: Entry[] = [];
  /** Set when the array holds only objects -> rendered as one table with a column per key. */
  columns: string[] | null = null;
  rows: TableRow[] = [];

  private local = true;
  private toggledAt = -1;

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['value'] && !changes['path']) return;
    const value = this.value;
    this.columns = null;
    this.rows = [];

    if (Array.isArray(value)) {
      this.kind = 'array';
      this.entries = value.map((item, index) => ({ key: index, value: item, path: [...this.path, index] }));
      const allObjects = value.length > 0 && value.every(item => JsonGridNode.isPlainObject(item));
      if (allObjects) {
        const columns: string[] = [];
        value.forEach(item => Object.keys(item).forEach(key => { if (!columns.includes(key)) columns.push(key); }));
        this.columns = columns;
        this.rows = value.map((item, index) => ({
          index,
          path: [...this.path, index],
          cells: columns.map(column => ({
            has: Object.prototype.hasOwnProperty.call(item, column),
            value: item[column],
            path: [...this.path, index, column],
          })),
        }));
      }
    } else if (JsonGridNode.isPlainObject(value)) {
      this.kind = 'object';
      this.entries = Object.keys(value).map(key => ({ key, value: value[key], path: [...this.path, key] }));
    } else {
      this.kind = 'primitive';
      this.entries = [];
    }

    if (changes['value']?.firstChange) this.local = this.depth < this.ctx.defaultDepth;
  }

  get expanded() {
    const bulk = this.ctx.bulk();
    return bulk && bulk.version > this.toggledAt ? bulk.expanded : this.local;
  }

  toggle(event?: Event) {
    event?.stopPropagation();
    this.local = !this.expanded;
    this.toggledAt = this.ctx.bulk()?.version ?? 0;
  }

  select(path: JsonPath, event?: Event) {
    event?.stopPropagation();
    this.ctx.select(path);
  }

  get primitiveType() {
    const value = this.value;
    return value === null ? 'null' : typeof value;
  }

  get display() {
    return typeof this.value === 'string' ? this.value : String(this.value);
  }

  get summary() {
    return this.kind === 'array'
      ? `[${this.entries.length}]`
      : `{${this.entries.length}}`;
  }

  exportCsv(event: Event) {
    event.stopPropagation();
    if (!this.columns) return;
    const csv = JsonUtils.toCsv(this.value as Record<string, unknown>[], this.columns);
    const name = this.path.length ? String(this.path[this.path.length - 1]) : 'json';
    FileUtils.download(csv, FileUtils.timestampedName(`${name}-grid`, 'csv'), 'text/csv');
  }

  static isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
