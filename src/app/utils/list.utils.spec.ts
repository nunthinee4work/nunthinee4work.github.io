import { ListUtils } from './list.utils';

describe('ListUtils', () => {
  it('should split on new lines and commas by default and trim', () => {
    const result = ListUtils.process(' a ,b\n\nc ');
    expect(result.items).toEqual(['a', 'b', 'c']);
    expect(result.output).toBe('a\nb\nc');
  });

  it('should format like the former Array Formatter', () => {
    const result = ListUtils.process("'111'\n'222'", { outputSeparator: 'COMMA', quote: 'DOUBLE_QUOTE' });
    expect(result.output).toBe('"111","222"');
    expect(ListUtils.process('a\nb', { outputSeparator: 'COMMA_NEWLINE', quote: 'SINGLE_QUOTE' }).output).toBe("'a',\n'b'");
  });

  it('should sort English first, then Thai, like the former Thai Locale Compare', () => {
    const items = ListUtils.process('ข้าว\nbanana\nกล้วย\nApple', { sort: 'ASC' }).items;
    expect(items).toEqual(['Apple', 'banana', 'กล้วย', 'ข้าว']);
    expect(ListUtils.process('ข้าว\nกล้วย', { sort: 'DESC' }).items).toEqual(['ข้าว', 'กล้วย']);
  });

  it('should sort numbers numerically when asked', () => {
    expect(ListUtils.process('10\n9\n100', { sort: 'ASC' }).items).toEqual(['10', '100', '9']);
    expect(ListUtils.process('10\n9\n100', { sort: 'ASC', numericSort: true }).items).toEqual(['9', '10', '100']);
  });

  it('should remove duplicates and count them', () => {
    const result = ListUtils.process('a\nb\na\na', { removeDuplicates: true });
    expect(result.items).toEqual(['a', 'b']);
    expect(result.inputCount).toBe(4);
    expect(result.duplicateCount).toBe(2);
  });

  it('should keep commas inside values when splitting by new line only', () => {
    expect(ListUtils.process('a,b\nc', { inputSeparator: 'NEW_LINE' }).items).toEqual(['a,b', 'c']);
  });

  it('should keep existing quotes when strip is off', () => {
    expect(ListUtils.process("'a'", { stripQuotes: false }).items).toEqual(["'a'"]);
  });

  describe('countDuplicates', () => {
    const input = 'apple\nbanana\napple\n\n cherry \nbanana\napple';

    it('should count each line, most frequent first', () => {
      const result = ListUtils.countDuplicates(input);
      expect(result.rows).toEqual([
        { value: 'apple', count: 3 },
        { value: 'banana', count: 2 },
        { value: 'cherry', count: 1 },
      ]);
      expect(result.totalLines).toBe(6);
      expect(result.uniqueValues).toBe(3);
      expect(result.duplicatedValues).toBe(2);
    });

    it('should show only duplicates, sorted by value or kept in first-seen order', () => {
      expect(ListUtils.countDuplicates(input, { duplicatesOnly: true, sort: 'VALUE' }).rows.map(r => r.value)).toEqual(['apple', 'banana']);
      expect(ListUtils.countDuplicates('b\na\nb', { sort: 'ORIGINAL' }).rows.map(r => r.value)).toEqual(['b', 'a']);
    });

    it('should optionally ignore case and keep commas inside a line', () => {
      const result = ListUtils.countDuplicates('A,1\na,1\nB', { ignoreCase: true });
      expect(result.rows[0]).toEqual({ value: 'A,1', count: 2 });
    });

    it('should format counts as text, CSV and TAB', () => {
      const rows = [{ value: 'x, y', count: 2 }, { value: 'say "hi"', count: 1 }];
      expect(ListUtils.formatCounts(rows, 'TEXT', true)).toBe('x, y (2)\nsay "hi" (1)');
      expect(ListUtils.formatCounts(rows, 'CSV', true)).toBe('Value,Count\n"x, y",2\n"say ""hi""",1');
      expect(ListUtils.formatCounts(rows, 'TAB', false)).toBe('Value\nx, y\n"say ""hi"""');
    });
  });
});
