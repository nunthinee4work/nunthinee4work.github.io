import { TextStatsUtils } from './text-stats.utils';

describe('TextStatsUtils', () => {
  it('should count English words, characters and sentences', () => {
    const stats = TextStatsUtils.analyze('Hello world. This is a test!');
    expect(stats.words).toBe(6);
    expect(stats.characters).toBe(28);
    expect(stats.charactersNoSpaces).toBe(23);
    expect(stats.sentences).toBe(2);
    expect(stats.longestWord).toBe('Hello');
  });

  it('should split Thai words even without spaces', () => {
    const words = TextStatsUtils.words('สินค้าหมดสต็อก');
    expect(words.length).toBeGreaterThan(1);
    expect(words.join('')).toBe('สินค้าหมดสต็อก');
  });

  it('should count Thai characters as users see them', () => {
    // น + ้ + ำ is one visible character cluster
    expect(TextStatsUtils.graphemeCount('น้ำ')).toBeLessThan('น้ำ'.length);
  });

  it('should count paragraphs, lines and UTF-8 bytes', () => {
    const stats = TextStatsUtils.analyze('one\ntwo\n\nthree');
    expect(stats.paragraphs).toBe(2);
    expect(stats.lines).toBe(4);
    expect(TextStatsUtils.analyze('ก').bytes).toBe(3);
  });

  it('should return zeros for empty text', () => {
    const stats = TextStatsUtils.analyze('');
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.lines).toBe(0);
  });

  it('should rank keywords and skip stop words', () => {
    const keywords = TextStatsUtils.keywords('the order and the order and the tote', 1);
    expect(keywords[0]).toEqual(jasmine.objectContaining({ phrase: 'order', count: 2 }));
    expect(keywords.some(k => k.phrase === 'the')).toBeFalse();
  });

  it('should find repeated two-word phrases', () => {
    const keywords = TextStatsUtils.keywords('split tote then split tote again', 2);
    expect(keywords[0]).toEqual(jasmine.objectContaining({ phrase: 'split tote', count: 2 }));
  });

  it('should format durations', () => {
    expect(TextStatsUtils.formatDuration(0.2)).toBe('12 sec');
    expect(TextStatsUtils.formatDuration(1.5)).toBe('1 min 30 sec');
    expect(TextStatsUtils.formatDuration(2)).toBe('2 min');
  });
});
