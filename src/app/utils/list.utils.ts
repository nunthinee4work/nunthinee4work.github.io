export type ListSeparator = 'NEW_LINE' | 'COMMA' | 'COMMA_SPACE' | 'COMMA_NEWLINE' | 'TAB';
export type ListQuote = 'NO_QUOTE' | 'SINGLE_QUOTE' | 'DOUBLE_QUOTE';
export type ListSort = 'NONE' | 'ASC' | 'DESC';

export interface ListOptions {
  /** How the input is split; `AUTO` splits on new lines and commas */
  inputSeparator: 'AUTO' | 'NEW_LINE' | 'COMMA';
  outputSeparator: ListSeparator;
  quote: ListQuote;
  sort: ListSort;
  trim: boolean;
  removeDuplicates: boolean;
  /** Drop ' and " already around the input values (e.g. pasted SQL IN lists) */
  stripQuotes: boolean;
  /** "2" before "10" instead of text order */
  numericSort: boolean;
}

export interface ListResult {
  items: string[];
  output: string;
  inputCount: number;
  duplicateCount: number;
}

export type CountSort = 'COUNT' | 'VALUE' | 'ORIGINAL';
export type CountFormat = 'TEXT' | 'CSV' | 'TAB';

export interface CountOptions {
  sort: CountSort;
  duplicatesOnly: boolean;
  trim: boolean;
  ignoreCase: boolean;
}

export interface CountRow {
  value: string;
  count: number;
}

export interface CountResult {
  rows: CountRow[];
  /** Non-blank lines in the input */
  totalLines: number;
  uniqueValues: number;
  /** Values that occur 2+ times */
  duplicatedValues: number;
}

export const DEFAULT_LIST_OPTIONS: ListOptions = {
  inputSeparator: 'AUTO',
  outputSeparator: 'NEW_LINE',
  quote: 'NO_QUOTE',
  sort: 'NONE',
  trim: true,
  removeDuplicates: false,
  stripQuotes: true,
  numericSort: false,
};

const JOINERS: Record<ListSeparator, string> = {
  NEW_LINE: '\n',
  COMMA: ',',
  COMMA_SPACE: ', ',
  COMMA_NEWLINE: ',\n',
  TAB: '\t',
};

export class ListUtils {
  static process(text: string, options: Partial<ListOptions> = {}): ListResult {
    const o = { ...DEFAULT_LIST_OPTIONS, ...options };
    const source = o.stripQuotes ? text.replace(/["']/g, '') : text;
    const splitter = o.inputSeparator === 'NEW_LINE' ? /\r?\n/ : o.inputSeparator === 'COMMA' ? /,/ : /\r?\n|,/;

    let items = source.split(splitter);
    if (o.trim) items = items.map(item => item.trim());
    items = items.filter(item => item.trim() !== '');

    const inputCount = items.length;
    if (o.removeDuplicates) items = [...new Set(items)];
    const duplicateCount = inputCount - items.length;

    if (o.sort !== 'NONE') {
      const collator = new Intl.Collator('th-TH', { numeric: o.numericSort, sensitivity: 'base' });
      items = [...items].sort((a, b) => ListUtils.thaiCompare(a, b, collator));
      if (o.sort === 'DESC') items.reverse();
    }

    const wrap = o.quote === 'DOUBLE_QUOTE' ? '"' : o.quote === 'SINGLE_QUOTE' ? "'" : '';
    const output = items.map(item => `${wrap}${item}${wrap}`).join(JOINERS[o.outputSeparator]);
    return { items, output, inputCount, duplicateCount };
  }

  /**
   * Count how often each line occurs (somacon.com "Count Duplicates in a List").
   * One value per line, so values may contain commas. Blank lines are skipped.
   */
  static countDuplicates(text: string, options: Partial<CountOptions> = {}): CountResult {
    const o: CountOptions = { sort: 'COUNT', duplicatesOnly: false, trim: true, ignoreCase: false, ...options };
    const counts = new Map<string, CountRow>();
    let totalLines = 0;

    for (const raw of text.split(/\r?\n/)) {
      const line = o.trim ? raw.trim() : raw;
      if (line.trim() === '') continue;
      totalLines++;
      const key = o.ignoreCase ? line.toLowerCase() : line;
      const row = counts.get(key);
      // Ignore case keeps the spelling seen first
      if (row) row.count++;
      else counts.set(key, { value: line, count: 1 });
    }

    const all = [...counts.values()];
    let rows = o.duplicatesOnly ? all.filter(row => row.count > 1) : all;
    if (o.sort === 'COUNT') {
      const collator = new Intl.Collator('th-TH', { numeric: true });
      rows = [...rows].sort((a, b) => b.count - a.count || ListUtils.thaiCompare(a.value, b.value, collator));
    } else if (o.sort === 'VALUE') {
      const collator = new Intl.Collator('th-TH', { numeric: true });
      rows = [...rows].sort((a, b) => ListUtils.thaiCompare(a.value, b.value, collator));
    }

    return {
      rows,
      totalLines,
      uniqueValues: all.length,
      duplicatedValues: all.filter(row => row.count > 1).length,
    };
  }

  /** Text: "value (3)" per line; CSV / TAB: Excel-compatible, double quotes as enclosure and escape. */
  static formatCounts(rows: CountRow[], format: CountFormat, includeCounts: boolean): string {
    if (format === 'TEXT') {
      return rows.map(row => includeCounts ? `${row.value} (${row.count})` : row.value).join('\n');
    }
    const separator = format === 'CSV' ? ',' : '\t';
    const cell = (value: string) => new RegExp(`["\n\r${separator}]`).test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const header = includeCounts ? ['Value', 'Count'] : ['Value'];
    return [
      header.join(separator),
      ...rows.map(row => includeCounts ? `${cell(row.value)}${separator}${row.count}` : cell(row.value)),
    ].join('\n');
  }

  /** Same rule as the former Thai Locale Compare: English (A–Z) first, then Thai (ก–ฮ), case-insensitive. */
  static thaiCompare(a: string, b: string, collator = new Intl.Collator('th-TH')): number {
    const aEnglish = /^[A-Za-z]/.test(a.trim());
    const bEnglish = /^[A-Za-z]/.test(b.trim());
    if (aEnglish !== bEnglish) return aEnglish ? -1 : 1;
    return collator.compare(a.trim().toLowerCase(), b.trim().toLowerCase());
  }
}
