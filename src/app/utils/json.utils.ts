export interface JsonValidationResult {
  valid: boolean;
  message?: string;
  line?: number;
  column?: number;
  /** Number of objects found, set by `validateObjectList` */
  count?: number;
}

export type JsonPath = (string | number)[];

export interface JsonLocation {
  /** Offset where the value starts */
  start: number;
  /** Offset just after the value */
  end: number;
  /** Offset of the property name for object members */
  keyStart?: number;
}

export class JsonUtils {
  static validate(text: string): JsonValidationResult {
    try {
      JSON.parse(text);
      return { valid: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Engine messages differ per browser and newer V8 omits the position, so locate it ourselves
      const offset = JsonUtils.findErrorOffset(text);
      const before = text.slice(0, offset).split('\n');
      return { valid: false, message, line: before.length, column: before[before.length - 1].length + 1 };
    }
  }

  /**
   * Parses one or many JSON objects pasted in any of these shapes:
   * `{...}`, `{...},{...}` (comma-separated, e.g. several documents copied from MongoDB) or `[{...},{...}]`.
   * Throws a SyntaxError when the text is not valid in any of them.
   */
  static parseObjectList(text: string): any[] {
    const trimmed = JsonUtils.normalizeMongoShell(text).trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed.startsWith('[') ? trimmed : `[${trimmed}]`);
    return (parsed as unknown[])
      .filter(item => item !== null && typeof item === 'object' && !Array.isArray(item))
      .map(item => JsonUtils.unwrapExtendedJson(item));
  }

  /**
   * Turns mongo-shell / mongosh helpers into plain JSON so documents copied from Compass, mongosh,
   * the legacy shell or Studio 3T parse:
   * - `ObjectId("x")`, `ISODate("x")`, `new Date("x")`, `UUID("x")`, `BinData(0, "x")` -> `"x"`
   * - `Long("1")`, `Int32(1)`, `Double(1.5)`, `Decimal128("1.5")`, `NumberLong(1)`, `NumberInt(1)` … -> number
   * - `Timestamp({ t: 1790147109, i: 1 })` / `Timestamp(1790147109, 1)` -> the seconds `t`
   * The replacement is padded with spaces to the original length so error line/column stay accurate.
   * Text inside JSON strings is left untouched.
   */
  static normalizeMongoShell(text: string): string {
    const call = /^(new\s+Date|[A-Za-z][A-Za-z0-9]*)\(([^()]*)\)/;
    let out = '';
    let inString = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        out += ch;
        if (ch === '\\') out += text[++i] ?? '';
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        out += ch;
        continue;
      }

      // Only at the start of a word, so e.g. `xLong(` inside something else isn't touched
      const match = /[A-Za-z]/.test(ch) && !/[A-Za-z0-9_$]/.test(text[i - 1] ?? '') ? call.exec(text.slice(i)) : null;
      const value = match ? JsonUtils.shellHelperValue(match[1], match[2]) : null;
      if (match && value !== null) {
        out += value.padEnd(match[0].length, ' ');
        i += match[0].length - 1;
        continue;
      }
      out += ch;
    }
    return out;
  }

  /** JSON text for one shell helper call, or null if `name` isn't a known helper. */
  private static shellHelperValue(name: string, args: string): string | null {
    const quoted = /"((?:[^"\\]|\\.)*)"|'([^']*)'/.exec(args);
    const firstString = quoted ? (quoted[1] ?? quoted[2]) : null;
    const firstNumber = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(args)?.[0] ?? null;

    if (/^new\s+Date$/.test(name) || name === 'Date') {
      if (firstString !== null) return JSON.stringify(firstString);
      return JSON.stringify((firstNumber !== null ? new Date(Number(firstNumber)) : new Date()).toISOString());
    }
    if (['ObjectId', 'ISODate', 'UUID', 'BinData', 'HexData'].includes(name)) {
      return firstString !== null ? JSON.stringify(firstString) : name === 'ISODate' ? JSON.stringify(new Date().toISOString()) : null;
    }
    if (['Long', 'Int32', 'Int64', 'Double', 'Decimal128', 'NumberLong', 'NumberInt', 'NumberDecimal', 'NumberDouble'].includes(name)) {
      const raw = (firstString ?? firstNumber ?? '0').trim();
      return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw) ? raw : JSON.stringify(raw);
    }
    if (name === 'Timestamp') {
      const t = /\bt\s*:\s*(\d+)/.exec(args)?.[1] ?? firstNumber;
      return t ?? '0';
    }
    return null;
  }

  /** Canonical Extended JSON (`{"$oid": ..}`, `{"$date": ..}`, `{"$numberLong": ..}`) -> plain values. */
  static unwrapExtendedJson(value: any): any {
    if (Array.isArray(value)) return value.map(item => JsonUtils.unwrapExtendedJson(item));
    if (value === null || typeof value !== 'object') return value;

    const keys = Object.keys(value);
    if (keys.length === 1) {
      const [key] = keys;
      const inner = value[key];
      if (key === '$oid' || key === '$uuid') return inner;
      if (key === '$date') {
        const date = typeof inner === 'object' ? Number(JsonUtils.unwrapExtendedJson(inner)) : inner;
        return typeof date === 'number' ? new Date(date).toISOString() : date;
      }
      if (['$numberLong', '$numberInt', '$numberDouble', '$numberDecimal'].includes(key)) return Number(inner);
    }

    return Object.fromEntries(keys.map(key => [key, JsonUtils.unwrapExtendedJson(value[key])]));
  }

  /** Like `validate`, but accepts the shapes supported by `parseObjectList` and reports the object count. */
  static validateObjectList(text: string): JsonValidationResult {
    text = JsonUtils.normalizeMongoShell(text);
    const trimmed = text.trim();
    if (trimmed.startsWith('[')) {
      const result = JsonUtils.validate(text);
      return result.valid ? { valid: true, count: JsonUtils.parseObjectList(text).length } : result;
    }

    // Validate the comma-separated form as an array, then map the location back to the original text
    const leading = text.length - text.trimStart().length;
    const wrapped = JsonUtils.validate(`[${trimmed}]`);
    if (wrapped.valid) return { valid: true, count: JsonUtils.parseObjectList(text).length };

    const offset = Math.max(0, JsonUtils.findErrorOffset(`[${trimmed}]`) - 1 + leading);
    const before = text.slice(0, offset).split('\n');
    return { ...wrapped, line: before.length, column: before[before.length - 1].length + 1 };
  }

  /**
   * Pretty-prints JSON (mongo-shell helpers allowed). With `sortKeys`, object keys are ordered
   * alphabetically at every level so two documents compare regardless of key order.
   */
  static format(text: string, options: { indent?: number; sortKeys?: boolean } = {}): string {
    const value = JSON.parse(JsonUtils.normalizeMongoShell(text));
    const sort = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(sort);
      if (node !== null && typeof node === 'object') {
        return Object.fromEntries(Object.keys(node).sort().map(key => [key, sort((node as Record<string, unknown>)[key])]));
      }
      return node;
    };
    return JSON.stringify(options.sortKeys ? sort(value) : value, null, options.indent ?? 2);
  }

  /** Stable string key for a path, e.g. `["items",0,"barcode"]`. */
  static pathKey(path: JsonPath): string {
    return JSON.stringify(path);
  }

  /** `["items", 0, "barcode"]` -> `$.items[0].barcode` */
  static pathLabel(path: JsonPath): string {
    return '$' + path.map(part => typeof part === 'number'
      ? `[${part}]`
      : /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`).join('');
  }

  /**
   * Parses valid JSON and records where every value (and property name) sits in the text,
   * keyed by `pathKey(path)`. Throws a SyntaxError on invalid input.
   */
  static parseWithLocations(text: string): { value: unknown; locations: Map<string, JsonLocation> } {
    JSON.parse(text); // fail fast with the engine's message
    const locations = new Map<string, JsonLocation>();
    let i = 0;
    const ws = () => { while (i < text.length && ' \t\n\r'.includes(text[i])) i++; };

    const readString = (): string => {
      const start = i++;
      while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
      i++;
      return JSON.parse(text.slice(start, i));
    };

    const readValue = (path: JsonPath, keyStart?: number): unknown => {
      ws();
      const start = i;
      let value: unknown;
      const ch = text[i];

      if (ch === '{') {
        const object: Record<string, unknown> = {};
        i++;
        ws();
        while (text[i] !== '}') {
          ws();
          const memberKeyStart = i;
          const key = readString();
          ws();
          i++; // :
          object[key] = readValue([...path, key], memberKeyStart);
          ws();
          if (text[i] === ',') i++;
          ws();
        }
        i++;
        value = object;
      } else if (ch === '[') {
        const array: unknown[] = [];
        i++;
        ws();
        while (text[i] !== ']') {
          array.push(readValue([...path, array.length]));
          ws();
          if (text[i] === ',') i++;
          ws();
        }
        i++;
        value = array;
      } else if (ch === '"') {
        value = readString();
      } else {
        const literal = /^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i))![0];
        i += literal.length;
        value = JSON.parse(literal);
      }

      locations.set(JsonUtils.pathKey(path), { start, end: i, keyStart });
      return value;
    };

    const value = readValue([]);
    return { value, locations };
  }

  /** CSV for an array of objects; nested values are written as JSON. */
  static toCsv(rows: Record<string, unknown>[], columns: string[]): string {
    const cell = (value: unknown) => {
      if (value === undefined || value === null) return '';
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [
      columns.map(cell).join(','),
      ...rows.map(row => columns.map(column => cell(row[column])).join(',')),
    ].join('\r\n');
  }

  /** Minimal JSON syntax scanner: returns the offset of the first invalid character (or text end). */
  static findErrorOffset(text: string): number {
    let i = 0;

    class Stop {
      constructor(readonly at: number) { }
    }
    const fail = (): never => { throw new Stop(i); };
    const skipWs = () => { while (i < text.length && ' \t\n\r'.includes(text[i])) i++; };
    const expect = (ch: string) => { if (text[i] !== ch) fail(); i++; };

    const literal = (word: string) => {
      for (const ch of word) expect(ch);
    };

    const string = () => {
      expect('"');
      while (i < text.length && text[i] !== '"') {
        const ch = text[i];
        if (ch < ' ') fail();
        if (ch === '\\') {
          i++;
          if (text[i] === 'u') {
            i++;
            for (let k = 0; k < 4; k++, i++) if (!/[0-9a-fA-F]/.test(text[i] ?? '')) fail();
            continue;
          }
          if (!'"\\/bfnrt'.includes(text[i] ?? 'x')) fail();
        }
        i++;
      }
      expect('"');
    };

    const number = () => {
      if (text[i] === '-') i++;
      if (text[i] === '0') i++;
      else if (/[1-9]/.test(text[i] ?? '')) while (/[0-9]/.test(text[i] ?? '')) i++;
      else fail();
      if (text[i] === '.') {
        i++;
        if (!/[0-9]/.test(text[i] ?? '')) fail();
        while (/[0-9]/.test(text[i] ?? '')) i++;
      }
      if (text[i] === 'e' || text[i] === 'E') {
        i++;
        if (text[i] === '+' || text[i] === '-') i++;
        if (!/[0-9]/.test(text[i] ?? '')) fail();
        while (/[0-9]/.test(text[i] ?? '')) i++;
      }
    };

    const value = (): void => {
      skipWs();
      const ch = text[i];
      if (ch === '{') {
        i++;
        skipWs();
        if (text[i] === '}') { i++; return; }
        for (;;) {
          skipWs();
          string();
          skipWs();
          expect(':');
          value();
          skipWs();
          if (text[i] === ',') { i++; continue; }
          expect('}');
          return;
        }
      }
      if (ch === '[') {
        i++;
        skipWs();
        if (text[i] === ']') { i++; return; }
        for (;;) {
          value();
          skipWs();
          if (text[i] === ',') { i++; continue; }
          expect(']');
          return;
        }
      }
      if (ch === '"') return string();
      if (ch === 't') return literal('true');
      if (ch === 'f') return literal('false');
      if (ch === 'n') return literal('null');
      return number();
    };

    try {
      value();
      skipWs();
      if (i < text.length) fail();
      return text.length;
    } catch (e) {
      if (e instanceof Stop) return Math.min(e.at, text.length);
      throw e;
    }
  }
}
