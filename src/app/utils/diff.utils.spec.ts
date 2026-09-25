import { DiffUtils } from './diff.utils';

describe('DiffUtils', () => {
  const apply = (a: string[], b: string[]) => {
    // Rebuilding b from the script proves the edit script is valid
    const ops = DiffUtils.diff(a, b);
    const rebuilt: string[] = [];
    ops.forEach(op => {
      if (op.type === 'equal') rebuilt.push(a[op.aIndex]);
      if (op.type === 'insert') rebuilt.push(b[op.bIndex]);
    });
    return { ops, rebuilt };
  };

  it('should produce a valid minimal edit script', () => {
    const a = 'ABCABBA'.split('');
    const b = 'CBABAC'.split('');
    const { ops, rebuilt } = apply(a, b);
    expect(rebuilt).toEqual(b);
    // Myers' classic example has an edit distance of 5
    expect(ops.filter(op => op.type !== 'equal').length).toBe(5);
  });

  it('should handle empty inputs', () => {
    expect(apply([], ['x']).rebuilt).toEqual(['x']);
    expect(DiffUtils.diff(['x'], []).map(op => op.type)).toEqual(['delete']);
    expect(DiffUtils.diff([], [])).toEqual([]);
  });

  it('should count removals and additions per line', () => {
    const result = DiffUtils.compareText('a\nb\nc', 'a\nB\nc\nd');
    expect(result.removals).toBe(1);
    expect(result.additions).toBe(2);
    expect(result.rows.map(r => r.type)).toEqual(['equal', 'modify', 'equal', 'insert']);
    expect(result.rows[1].left?.num).toBe(2);
    expect(result.rows[3].right?.num).toBe(4);
  });

  it('should highlight only the changed words on modified lines', () => {
    const [left, right] = DiffUtils.compareWords('qty: 2 EA', 'qty: 5 EA');
    expect(left.filter(p => p.changed).map(p => p.text)).toEqual(['2']);
    expect(right.filter(p => p.changed).map(p => p.text)).toEqual(['5']);
  });

  it('should treat Thai words as tokens', () => {
    const [, right] = DiffUtils.compareWords('สินค้า ก', 'สินค้า ข');
    expect(right.filter(p => p.changed).map(p => p.text)).toEqual(['ข']);
  });

  it('should ignore whitespace and case when asked', () => {
    expect(DiffUtils.compareText('Hello  World', ' hello world ', { ignoreWhitespace: true, ignoreCase: true }).identical).toBeTrue();
    expect(DiffUtils.compareText('Hello', 'hello').identical).toBeFalse();
  });

  it('should normalise Windows line endings', () => {
    expect(DiffUtils.compareText('a\r\nb', 'a\nb').identical).toBeTrue();
  });

  it('should pair a changed line with its most similar counterpart, not just the next one', () => {
    const result = DiffUtils.compareText('A qty 2\nstatus NEW', 'A qty 5\nC qty 6\nstatus PICKED');
    const modified = result.rows.filter(r => r.type === 'modify').map(r => [r.left?.text, r.right?.text]);
    expect(modified).toEqual([['A qty 2', 'A qty 5'], ['status NEW', 'status PICKED']]);
    expect(result.rows.find(r => r.type === 'insert')?.right?.text).toBe('C qty 6');
  });

  it('should show dissimilar replaced lines side by side without word highlights', () => {
    const result = DiffUtils.compareText('alpha beta', 'gamma delta');
    expect(result.rows.map(r => r.type)).toEqual(['modify']);
    expect(result.rows[0].left?.parts).toBeUndefined();
    expect(result.removals).toBe(1);
    expect(result.additions).toBe(1);
  });
});
