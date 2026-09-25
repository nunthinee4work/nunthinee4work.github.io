export type DiffOp = { type: 'equal' | 'delete' | 'insert'; aIndex: number; bIndex: number };

export interface DiffPart {
  text: string;
  /** true when this piece changed compared to the other side */
  changed: boolean;
}

export interface DiffSide {
  /** 1-based line number */
  num: number;
  text: string;
  /** Word-level pieces, only for modified lines */
  parts?: DiffPart[];
}

export interface DiffRow {
  type: 'equal' | 'delete' | 'insert' | 'modify';
  left?: DiffSide;
  right?: DiffSide;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

export interface DiffResult {
  rows: DiffRow[];
  removals: number;
  additions: number;
  identical: boolean;
}

export class DiffUtils {
  /** Removed/added lines at least this similar (0..1) are shown as one modified line. */
  static readonly PAIR_THRESHOLD = 0.5;

  /**
   * Myers O(ND) diff. Returns the edit script as equal / delete (from `a`) / insert (from `b`) steps.
   * `equals` lets callers compare normalised keys while keeping the original text.
   */
  static diff<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean = (x, y) => x === y): DiffOp[] {
    const n = a.length;
    const m = b.length;
    const max = n + m;
    const offset = max;
    let v = new Int32Array(2 * max + 2);
    const trace: Int32Array[] = [];

    outer:
    for (let d = 0; d <= max; d++) {
      trace.push(v.slice());
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
        let y = x - k;
        while (x < n && y < m && equals(a[x], b[y])) {
          x++;
          y++;
        }
        v[offset + k] = x;
        if (x >= n && y >= m) {
          trace.push(v.slice());
          break outer;
        }
      }
    }

    // Walk the trace backwards to recover the path
    const ops: DiffOp[] = [];
    let x = n;
    let y = m;
    for (let d = trace.length - 2; d >= 0 && (x > 0 || y > 0); d--) {
      v = trace[d];
      const k = x - y;
      const prevK = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1;
      const prevX = d === 0 ? 0 : v[offset + prevK];
      const prevY = prevX - prevK;
      while (x > prevX && y > prevY) {
        ops.push({ type: 'equal', aIndex: --x, bIndex: --y });
      }
      if (d > 0) {
        if (x === prevX) ops.push({ type: 'insert', aIndex: x, bIndex: --y });
        else ops.push({ type: 'delete', aIndex: --x, bIndex: y });
      }
    }
    while (x > 0 && y > 0) ops.push({ type: 'equal', aIndex: --x, bIndex: --y });
    return ops.reverse();
  }

  /** Line-by-line comparison with word-level highlights on modified lines. */
  static compareText(left: string, right: string, options: DiffOptions = {}): DiffResult {
    const a = DiffUtils.splitLines(left);
    const b = DiffUtils.splitLines(right);
    const key = (line: string) => DiffUtils.normalize(line, options);
    const aKeys = a.map(key);
    const bKeys = b.map(key);
    const ops = DiffUtils.diff(aKeys, bKeys);

    const rows: DiffRow[] = [];
    let removals = 0;
    let additions = 0;

    for (let i = 0; i < ops.length;) {
      const op = ops[i];
      if (op.type === 'equal') {
        rows.push({
          type: 'equal',
          left: { num: op.aIndex + 1, text: a[op.aIndex] },
          right: { num: op.bIndex + 1, text: b[op.bIndex] },
        });
        i++;
        continue;
      }

      // Collect one change block: deletes and inserts until the next equal line
      const deletes: DiffOp[] = [];
      const inserts: DiffOp[] = [];
      while (i < ops.length && ops[i].type !== 'equal') {
        (ops[i].type === 'delete' ? deletes : inserts).push(ops[i]);
        i++;
      }
      removals += deletes.length;
      additions += inserts.length;

      // Pair each removed line with the next similar added line (keeps order); paired lines get
      // word-level highlights, the rest stay pure removals / additions
      const block: DiffRow[] = [];
      let next = 0;
      const pushInsert = (op: DiffOp) =>
        block.push({ type: 'insert', right: { num: op.bIndex + 1, text: b[op.bIndex] } });

      for (const del of deletes) {
        let match = -1;
        for (let k = next; k < inserts.length; k++) {
          if (DiffUtils.similarity(aKeys[del.aIndex], bKeys[inserts[k].bIndex]) >= DiffUtils.PAIR_THRESHOLD) {
            match = k;
            break;
          }
        }
        if (match === -1) {
          block.push({ type: 'delete', left: { num: del.aIndex + 1, text: a[del.aIndex] } });
          continue;
        }
        inserts.slice(next, match).forEach(pushInsert);
        const ins = inserts[match];
        const [leftParts, rightParts] = DiffUtils.compareWords(a[del.aIndex], b[ins.bIndex], options);
        block.push({
          type: 'modify',
          left: { num: del.aIndex + 1, text: a[del.aIndex], parts: leftParts },
          right: { num: ins.bIndex + 1, text: b[ins.bIndex], parts: rightParts },
        });
        next = match + 1;
      }
      inserts.slice(next).forEach(pushInsert);
      rows.push(...DiffUtils.zipUnpaired(block));
    }

    return { rows, removals, additions, identical: removals === 0 && additions === 0 };
  }

  /** Word-level diff of two lines -> highlighted pieces for each side. */
  static compareWords(left: string, right: string, options: DiffOptions = {}): [DiffPart[], DiffPart[]] {
    const a = DiffUtils.tokenize(left);
    const b = DiffUtils.tokenize(right);
    const key = (token: string) => {
      let value = options.ignoreCase ? token.toLowerCase() : token;
      if (options.ignoreWhitespace && /^\s+$/.test(value)) value = ' ';
      return value;
    };
    const ops = DiffUtils.diff(a.map(key), b.map(key));
    const leftParts: DiffPart[] = [];
    const rightParts: DiffPart[] = [];
    const push = (parts: DiffPart[], text: string, changed: boolean) => {
      const last = parts[parts.length - 1];
      if (last && last.changed === changed) last.text += text;
      else parts.push({ text, changed });
    };
    for (const op of ops) {
      if (op.type === 'equal') {
        push(leftParts, a[op.aIndex], false);
        push(rightParts, b[op.bIndex], false);
      } else if (op.type === 'delete') {
        push(leftParts, a[op.aIndex], true);
      } else {
        push(rightParts, b[op.bIndex], true);
      }
    }
    return [leftParts, rightParts];
  }

  /**
   * Unpaired removals directly followed by unpaired additions share rows so the split view stays
   * side by side (whole-line highlight, no word diff because the lines aren't similar).
   */
  private static zipUnpaired(block: DiffRow[]): DiffRow[] {
    const out: DiffRow[] = [];
    for (let i = 0; i < block.length;) {
      if (block[i].type !== 'delete') {
        out.push(block[i++]);
        continue;
      }
      const deletes: DiffRow[] = [];
      while (i < block.length && block[i].type === 'delete') deletes.push(block[i++]);
      const inserts: DiffRow[] = [];
      while (i < block.length && block[i].type === 'insert') inserts.push(block[i++]);
      const pairs = Math.max(deletes.length, inserts.length);
      for (let p = 0; p < pairs; p++) {
        const left = deletes[p]?.left;
        const right = inserts[p]?.right;
        out.push(left && right ? { type: 'modify', left, right } : left ? { type: 'delete', left } : { type: 'insert', right });
      }
    }
    return out;
  }

  /** Share of non-whitespace tokens two lines have in common (Dice coefficient, 0..1). */
  static similarity(left: string, right: string): number {
    const a = DiffUtils.tokenize(left).filter(t => !/^\s+$/.test(t));
    const b = DiffUtils.tokenize(right).filter(t => !/^\s+$/.test(t));
    if (!a.length && !b.length) return 1;
    const common = DiffUtils.diff(a, b).filter(op => op.type === 'equal').length;
    return (2 * common) / (a.length + b.length);
  }

  static splitLines(text: string): string[] {
    if (text === '') return [];
    return text.replace(/\r\n?/g, '\n').split('\n');
  }

  /** Words (any script, incl. Thai), runs of whitespace, or single symbols. */
  static tokenize(line: string): string[] {
    return line.match(/[\p{L}\p{M}\p{N}_]+|\s+|[^\p{L}\p{M}\p{N}_\s]/gu) ?? [];
  }

  private static normalize(line: string, options: DiffOptions) {
    let value = line;
    if (options.ignoreWhitespace) value = value.trim().replace(/\s+/g, ' ');
    if (options.ignoreCase) value = value.toLowerCase();
    return value;
  }
}
