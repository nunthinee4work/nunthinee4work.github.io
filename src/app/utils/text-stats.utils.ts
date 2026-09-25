export interface KeywordCount {
  phrase: string;
  count: number;
  /** Share of all words, 0..100 */
  percent: number;
}

export interface TextStats {
  words: number;
  uniqueWords: number;
  /** User-perceived characters (grapheme clusters — a Thai consonant + its marks count once) */
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** UTF-8 size, useful for DB / API field limits */
  bytes: number;
  averageWordLength: number;
  longestWord: string;
  /** Minutes at ~238 words per minute */
  readingMinutes: number;
  /** Minutes at ~150 words per minute */
  speakingMinutes: number;
}

const READING_WPM = 238;
const SPEAKING_WPM = 150;

// Very common words that drown out useful keywords
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'is', 'are',
  'was', 'were', 'be', 'been', 'it', 'this', 'that', 'as', 'i', 'you', 'he', 'she', 'we', 'they', 'not', 'no',
  'ที่', 'และ', 'ของ', 'ใน', 'การ', 'เป็น', 'มี', 'ได้', 'ให้', 'จะ', 'ก็', 'ไป', 'มา', 'ว่า', 'กับ', 'แล้ว', 'หรือ',
  'นี้', 'นั้น', 'ไม่', 'คือ', 'จาก', 'โดย', 'อยู่', 'ซึ่ง', 'แต่', 'ความ', 'เพื่อ', 'ด้วย',
]);

type Segmenter = { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> };

export class TextStatsUtils {
  static analyze(text: string, locale = 'th'): TextStats {
    const words = TextStatsUtils.words(text, locale);
    const characters = TextStatsUtils.graphemeCount(text, locale);
    const charactersNoSpaces = TextStatsUtils.graphemeCount(text.replace(/\s+/g, ''), locale);
    const lower = words.map(word => word.toLowerCase());
    const longestWord = words.reduce((longest, word) => word.length > longest.length ? word : longest, '');
    const totalWordLength = words.reduce((sum, word) => sum + TextStatsUtils.graphemeCount(word, locale), 0);

    return {
      words: words.length,
      uniqueWords: new Set(lower).size,
      characters,
      charactersNoSpaces,
      sentences: TextStatsUtils.sentenceCount(text, locale),
      paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
      lines: text ? text.split(/\r\n|\r|\n/).length : 0,
      bytes: new TextEncoder().encode(text).length,
      averageWordLength: words.length ? totalWordLength / words.length : 0,
      longestWord,
      readingMinutes: words.length / READING_WPM,
      speakingMinutes: words.length / SPEAKING_WPM,
    };
  }

  /** Words in reading order. Thai has no spaces between words, so use the browser's word segmenter. */
  static words(text: string, locale = 'th'): string[] {
    const segmenter = TextStatsUtils.segmenter(locale, 'word');
    if (!segmenter) return text.match(/[\p{L}\p{M}\p{N}_'’-]+/gu) ?? [];
    const words: string[] = [];
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike) words.push(segment);
    }
    return words;
  }

  /** Most frequent words (n = 1) or phrases of n words, ignoring case. */
  static keywords(text: string, n = 1, options: { limit?: number; excludeStopWords?: boolean; locale?: string } = {}): KeywordCount[] {
    const { limit = 10, excludeStopWords = true, locale = 'th' } = options;
    const words = TextStatsUtils.words(text, locale).map(word => word.toLowerCase());
    if (words.length < n) return [];

    const counts = new Map<string, number>();
    for (let i = 0; i + n <= words.length; i++) {
      const gram = words.slice(i, i + n);
      // Phrases that are only stop words (or single stop words) aren't useful keywords
      if (excludeStopWords && gram.every(word => STOP_WORDS.has(word))) continue;
      if (n === 1 && gram[0].length < 2 && !/\p{Script=Thai}/u.test(gram[0])) continue;
      // Thai words are joined without spaces, like the original text
      const phrase = gram.join(/\p{Script=Thai}/u.test(gram.join('')) ? '' : ' ');
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }

    return [...counts.entries()]
      .filter(([, count]) => n === 1 || count > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale))
      .slice(0, limit)
      .map(([phrase, count]) => ({ phrase, count, percent: (count / words.length) * 100 }));
  }

  static graphemeCount(text: string, locale = 'th'): number {
    const segmenter = TextStatsUtils.segmenter(locale, 'grapheme');
    if (!segmenter) return [...text].length;
    let count = 0;
    for (const _ of segmenter.segment(text)) count++;
    return count;
  }

  /** "1 min 30 sec" / "12 sec" */
  static formatDuration(minutes: number): string {
    const totalSeconds = Math.round(minutes * 60);
    if (totalSeconds < 60) return `${totalSeconds} sec`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs ? `${mins} min ${secs} sec` : `${mins} min`;
  }

  private static sentenceCount(text: string, locale: string): number {
    if (!text.trim()) return 0;
    const segmenter = TextStatsUtils.segmenter(locale, 'sentence');
    const pieces = segmenter
      ? [...segmenter.segment(text)].map(piece => piece.segment)
      : text.split(/(?<=[.!?。])\s+/);
    // Thai rarely uses punctuation; line breaks usually end a sentence there
    return pieces
      .flatMap(piece => piece.split(/\n+/))
      .filter(piece => /[\p{L}\p{N}]/u.test(piece)).length;
  }

  private static segmenter(locale: string, granularity: 'word' | 'grapheme' | 'sentence'): Segmenter | null {
    const Ctor = (Intl as unknown as { Segmenter?: new (locale: string, options: object) => Segmenter }).Segmenter;
    return Ctor ? new Ctor(locale, { granularity }) : null;
  }
}
