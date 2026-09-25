export type CalcLineKind = 'empty' | 'header' | 'comment' | 'value' | 'error';

export interface CalcLine {
  kind: CalcLineKind;
  /** Result of a `value` line */
  value?: number;
  /** Variable assigned on this line (`name = …`) */
  variable?: string;
  /** Uses sum / total / avg: left out of the footer total so nothing is counted twice */
  aggregate?: boolean;
}

interface Operand {
  value: number;
  /** `x%` not yet applied: `a + x%` means a + a·x/100 */
  percent: boolean;
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string };

const IDENT = /^[A-Za-z_฀-๿][\w฀-๿]*/;
const NUMBER = /^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?|^\.\d+/;
const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };
/** Words that read the lines above instead of a variable */
const AGGREGATES = ['sum', 'total', 'avg', 'average', 'prev'];

/**
 * Numi-style notepad calculator: every line is evaluated on its own.
 * - `# Title` is a header, `// note` a comment (also allowed after an expression)
 * - `name = expr` stores a variable; `label: expr` ignores the label
 * - `prev` = previous result, `sum` / `total` / `avg` = results above in the current block
 *   (a block ends at a blank line or a header)
 * - `x%` = x/100, `a + x%` / `a - x%` add / remove x percent of a, `x% of a`
 * No `eval`: a small recursive-descent parser.
 */
export class CalcUtils {
  /**
   * `precision` (decimal places, null = full precision) rounds every line's result before it is
   * stored, so later lines, variables, `prev`, `sum` and the total all use the rounded value.
   */
  static evaluate(text: string, options: { precision?: number | null } = {}): CalcLine[] {
    const precision = options.precision ?? null;
    const variables = new Map<string, number>();
    const lines: CalcLine[] = [];
    let block: number[] = [];
    let prev: number | undefined;

    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) {
        lines.push({ kind: 'empty' });
        block = [];
        continue;
      }
      if (line.startsWith('#')) {
        lines.push({ kind: 'header' });
        block = [];
        continue;
      }
      const code = line.replace(/\/\/.*$/, '').trim();
      if (!code) {
        lines.push({ kind: 'comment' });
        continue;
      }

      let expression = code;
      let variable: string | undefined;
      const assignment = /^([A-Za-z_฀-๿][\w฀-๿]*)\s*=(?!=)\s*(.+)$/.exec(code);
      const labelled = /^[^:=]+:\s*(.+)$/.exec(code);
      if (assignment) {
        variable = assignment[1];
        expression = assignment[2];
      } else if (labelled) {
        expression = labelled[1];
      }

      const scope = {
        usedAggregate: false,
        variables,
        aggregates: {
          prev, sum: CalcUtils.sum(block), total: CalcUtils.sum(block),
          avg: block.length ? CalcUtils.sum(block) / block.length : undefined,
          average: block.length ? CalcUtils.sum(block) / block.length : undefined,
        } as Record<string, number | undefined>,
      };
      const exact = CalcUtils.evaluateExpression(expression, scope);
      if (exact === null) {
        lines.push({ kind: 'error' });
        continue;
      }
      const value = precision === null ? exact : CalcUtils.round(exact, precision);
      if (variable) variables.set(variable, value);
      lines.push({ kind: 'value', value, variable, aggregate: scope.usedAggregate || undefined });
      block.push(value);
      prev = value;
    }
    return lines;
  }

  /** Sum of every result (the footer total) */
  static total(lines: CalcLine[]): number {
    return CalcUtils.sum(lines.filter(line => line.kind === 'value' && !line.aggregate).map(line => line.value!));
  }

  /** Half away from zero at `decimals` places (2.345 -> 2.35, -2.5 -> -3 at 0) */
  static round(value: number, decimals: number): number {
    // shift the decimal point in the string form: 1.005 * 100 is 100.49999… in floating point, 1.005e2 is 100.5
    const abs = Math.abs(value);
    if (String(abs).includes('e')) return Math.sign(value) * (Math.round(abs * 10 ** decimals) / 10 ** decimals) || 0; // 1e-7, 1e21…
    const shifted = Math.round(Number(`${abs}e${decimals}`));
    return Math.sign(value) * Number(`${shifted}e-${decimals}`) || 0;
  }

  /**
   * For reading: 1234567.5 -> "1,234,567.5". `decimals` null = auto (up to 10, no trailing zeros),
   * a number = exactly that many (2 -> "1,234,567.50").
   */
  static format(value: number, decimals: number | null = null): string {
    return CalcUtils.digits(value, decimals, true);
  }

  /** Splits a line for highlighting: code, then a trailing `// comment` (headers are one piece) */
  static splitComment(line: string): [string, string] {
    if (line.trim().startsWith('#')) return [line, ''];
    const index = line.indexOf('//');
    return index < 0 ? [line, ''] : [line.slice(0, index), line.slice(index)];
  }

  /** For copying: like `format` without thousand separators ("1234567.50") */
  static plain(value: number, decimals: number | null = null): string {
    return CalcUtils.digits(value, decimals, false);
  }

  private static digits(value: number, decimals: number | null, grouped: boolean): string {
    if (!Number.isFinite(value)) return String(value);
    const rounded = CalcUtils.round(value, decimals ?? 10);
    let [whole, fraction = ''] = Math.abs(rounded).toFixed(decimals ?? 10).split('.');
    if (decimals === null) fraction = fraction.replace(/0+$/, '');
    if (grouped) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${rounded < 0 ? '-' : ''}${whole}${fraction ? '.' + fraction : ''}`;
  }

  /** One expression, or null when it can't be read (unknown word, ÷ 0, …) */
  static evaluateExpression(
    expression: string,
    scope: { variables: Map<string, number>; aggregates: Record<string, number | undefined>; usedAggregate?: boolean } =
      { variables: new Map(), aggregates: {} },
  ): number | null {
    const tokens = CalcUtils.tokenize(expression);
    if (!tokens?.length) return null;
    let position = 0;
    const peek = () => tokens[position];
    const isOp = (value: string) => peek()?.type === 'op' && peek()!.value === value;
    const isWord = (value: string) => peek()?.type === 'ident' && (peek()!.value as string).toLowerCase() === value;
    const fail = (): never => { throw new Error('parse'); };

    const additive = (): Operand => {
      let left = multiplicative();
      while (isOp('+') || isOp('-')) {
        const op = (tokens[position++] as { value: string }).value;
        const right = multiplicative();
        const amount = right.percent ? left.value * right.value : right.value;
        left = { value: op === '+' ? left.value + amount : left.value - amount, percent: false };
      }
      return left;
    };

    const multiplicative = (): Operand => {
      let left = unary();
      while (isOp('*') || isOp('/') || isWord('mod')) {
        const op = (tokens[position++] as { value: string }).value.toLowerCase();
        const right = unary();
        if (op === '/' && right.value === 0) fail();
        left = {
          value: op === '*' ? left.value * right.value : op === '/' ? left.value / right.value : left.value % right.value,
          percent: false,
        };
      }
      return left;
    };

    // unary minus binds looser than ^, so -2 ^ 2 = -4
    const unary = (): Operand => {
      if (isOp('-')) {
        position++;
        const operand = unary();
        return { value: -operand.value, percent: operand.percent };
      }
      if (isOp('+')) {
        position++;
        return unary();
      }
      return power();
    };

    const power = (): Operand => {
      const base = postfix();
      if (isOp('^')) {
        position++;
        const exponent = unary();
        return { value: base.value ** exponent.value, percent: false };
      }
      return base;
    };

    const postfix = (): Operand => {
      const operand = primary();
      if (!isOp('%')) return { value: operand, percent: false };
      position++;
      if (isWord('of')) {
        position++;
        return { value: (operand / 100) * unary().value, percent: false };
      }
      return { value: operand / 100, percent: true };
    };

    const primary = (): number => {
      const token = tokens[position++] ?? fail();
      if (token.type === 'number') return token.value;
      if (token.type === 'op' && token.value === '(') {
        const inner = additive();
        if (!isOp(')')) fail();
        position++;
        return inner.value;
      }
      if (token.type === 'ident') {
        const word = token.value;
        const lower = word.toLowerCase();
        if (FUNCTIONS[lower] && isOp('(')) {
          position++;
          const argument = additive();
          if (!isOp(')')) fail();
          position++;
          return FUNCTIONS[lower](argument.value);
        }
        if (scope.variables.has(word)) return scope.variables.get(word)!;
        if (AGGREGATES.includes(lower)) {
          if (lower !== 'prev') scope.usedAggregate = true;
          return scope.aggregates[lower] ?? fail();
        }
        if (lower in CONSTANTS) return CONSTANTS[lower];
      }
      return fail();
    };

    try {
      const result = additive();
      if (position !== tokens.length || !Number.isFinite(result.value)) return null;
      return result.value;
    } catch {
      return null;
    }
  }

  private static tokenize(text: string): Token[] | null {
    const tokens: Token[] = [];
    let rest = text;
    while (rest.length) {
      const space = /^\s+/.exec(rest);
      if (space) {
        rest = rest.slice(space[0].length);
        continue;
      }
      const number = NUMBER.exec(rest);
      if (number) {
        tokens.push({ type: 'number', value: Number(number[0].replace(/,/g, '')) });
        rest = rest.slice(number[0].length);
        continue;
      }
      const ident = IDENT.exec(rest);
      if (ident) {
        tokens.push({ type: 'ident', value: ident[0] });
        rest = rest.slice(ident[0].length);
        continue;
      }
      const symbol = rest[0];
      const op = symbol === '×' ? '*' : symbol === '÷' ? '/' : symbol === '−' ? '-' : symbol;
      if (!'+-*/^%()'.includes(op)) return null;
      tokens.push({ type: 'op', value: op });
      rest = rest.slice(1);
    }
    return tokens;
  }

  private static sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }
}
