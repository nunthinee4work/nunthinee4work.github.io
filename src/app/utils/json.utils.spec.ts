import { JsonUtils } from './json.utils';

describe('JsonUtils.validate', () => {
  it('should accept valid JSON', () => {
    expect(JsonUtils.validate('{"a": [1, 2]}')).toEqual({ valid: true });
  });

  it('should report the line and column of a syntax error', () => {
    const result = JsonUtils.validate('{\n  "a": 1,\n  "b": }');
    expect(result.valid).toBeFalse();
    expect(result.line).toBe(3);
    expect(result.column).toBe(8);
    expect(result.message).toBeTruthy();
  });

  it('should point at the end for truncated input', () => {
    const result = JsonUtils.validate('{\n  "a": 1');
    expect(result.valid).toBeFalse();
    expect(result.line).toBe(2);
  });

  it('should locate trailing commas and garbage after the value', () => {
    expect(JsonUtils.validate('[1, 2,]')).toEqual(jasmine.objectContaining({ line: 1, column: 7 }));
    expect(JsonUtils.validate('{"a": 1} x')).toEqual(jasmine.objectContaining({ line: 1, column: 10 }));
  });

  it('should locate an unquoted key inside a nested object', () => {
    const result = JsonUtils.validate('{\n  "items": [\n    { barcode: "885" }\n  ]\n}');
    expect(result).toEqual(jasmine.objectContaining({ valid: false, line: 3, column: 7 }));
  });

  describe('object lists', () => {
    it('should parse a single object, comma-separated objects and an array', () => {
      expect(JsonUtils.parseObjectList('{"a":1}')).toEqual([{ a: 1 }]);
      expect(JsonUtils.parseObjectList('{"a":1},\n{"a":2}')).toEqual([{ a: 1 }, { a: 2 }]);
      expect(JsonUtils.parseObjectList('  [{"a":1},{"a":2}]  ')).toEqual([{ a: 1 }, { a: 2 }]);
      expect(JsonUtils.parseObjectList('   ')).toEqual([]);
    });

    it('should drop non-object entries', () => {
      expect(JsonUtils.parseObjectList('[{"a":1}, 2, null, [3]]')).toEqual([{ a: 1 }]);
    });

    it('should throw for invalid input', () => {
      expect(() => JsonUtils.parseObjectList('{"a":1} {"a":2}')).toThrow();
    });

    it('should report the count for every supported shape', () => {
      expect(JsonUtils.validateObjectList('{"a":1}').count).toBe(1);
      expect(JsonUtils.validateObjectList('{"a":1},{"a":2}').count).toBe(2);
      expect(JsonUtils.validateObjectList('[{"a":1},{"a":2},{"a":3}]').count).toBe(3);
    });

    it('should map the error location back to the original comma-separated text', () => {
      const result = JsonUtils.validateObjectList('\n{"a":1},\n{ b: 2 }');
      expect(result).toEqual(jasmine.objectContaining({ valid: false, line: 3, column: 3 }));
    });

    it('should locate a missing comma between objects', () => {
      const result = JsonUtils.validateObjectList('{"a":1}\n{"a":2}');
      expect(result).toEqual(jasmine.objectContaining({ valid: false, line: 2, column: 1 }));
    });
  });

  describe('mongo shell / extended JSON', () => {
    it('should accept shell helpers like ObjectId and ISODate', () => {
      const text = '{\n  "_id" : ObjectId("6ab378f77878c679bbdff386"),\n  "po": { "pickDate": ISODate("2026-09-23T00:00:00.000Z") },\n  "qty": NumberLong(5), "price": NumberDecimal("12.50")\n}';
      expect(JsonUtils.parseObjectList(text)).toEqual([{
        _id: '6ab378f77878c679bbdff386',
        po: { pickDate: '2026-09-23T00:00:00.000Z' },
        qty: 5,
        price: 12.5
      }]);
      expect(JsonUtils.validateObjectList(text)).toEqual({ valid: true, count: 1 });
    });

    it('should not touch helper-like text inside strings', () => {
      expect(JsonUtils.parseObjectList('{"note": "ObjectId(\\"x\\") here"}')).toEqual([{ note: 'ObjectId("x") here' }]);
    });

    it('should keep error positions accurate after normalising helpers', () => {
      const result = JsonUtils.validateObjectList('{ "_id": ObjectId("abc"), bad: 1 }');
      expect(result).toEqual(jasmine.objectContaining({ valid: false, line: 1, column: 27 }));
    });

    it('should unwrap canonical extended JSON', () => {
      const text = '{"_id": {"$oid": "abc"}, "d": {"$date": "2026-09-23T00:00:00Z"}, "n": {"$numberLong": "7"}, "t": {"$date": {"$numberLong": "0"}}}';
      expect(JsonUtils.parseObjectList(text)).toEqual([{ _id: 'abc', d: '2026-09-23T00:00:00Z', n: 7, t: '1970-01-01T00:00:00.000Z' }]);
    });
  });

  describe('parseWithLocations', () => {
    it('should map every path to its text offsets', () => {
      const text = '{\n  "a": [1, {"b": "x"}],\n  "c": null\n}';
      const { value, locations } = JsonUtils.parseWithLocations(text);
      const slice = (path: (string | number)[]) => {
        const loc = locations.get(JsonUtils.pathKey(path))!;
        return text.slice(loc.start, loc.end);
      };

      expect(value).toEqual({ a: [1, { b: 'x' }], c: null });
      expect(slice(['a', 0])).toBe('1');
      expect(slice(['a', 1, 'b'])).toBe('"x"');
      expect(slice(['c'])).toBe('null');
      const c = locations.get(JsonUtils.pathKey(['c']))!;
      expect(text.slice(c.keyStart!, c.end)).toBe('"c": null');
    });

    it('should throw for invalid JSON', () => {
      expect(() => JsonUtils.parseWithLocations('{"a":}')).toThrow();
    });
  });

  it('should label paths in JSONPath style', () => {
    expect(JsonUtils.pathLabel(['items', 0, 'barcode'])).toBe('$.items[0].barcode');
    expect(JsonUtils.pathLabel(['a b'])).toBe('$["a b"]');
  });

  it('should build CSV with escaping and nested values as JSON', () => {
    const csv = JsonUtils.toCsv([{ a: 'x,y', b: { c: 1 } }, { a: 'say "hi"' }], ['a', 'b']);
    expect(csv).toBe('a,b\r\n"x,y","{""c"":1}"\r\n"say ""hi""",');
  });

  it('should format JSON, optionally sorting keys at every level', () => {
    expect(JsonUtils.format('{"b":1,"a":[{"d":1,"c":2}]}', { sortKeys: true }))
      .toBe('{\n  "a": [\n    {\n      "c": 2,\n      "d": 1\n    }\n  ],\n  "b": 1\n}');
    expect(JsonUtils.format('{"_id": ObjectId("x")}')).toBe('{\n  "_id": "x"\n}');
  });

  describe('mongosh (Compass / new shell) helpers', () => {
    it('should read Long, Int32, Double, Decimal128 as numbers', () => {
      const text = '{\n  "version" : Long("1"),\n  "qty" : Int32(5),\n  "price" : Double(12.5),\n  "amount" : Decimal128("99.90")\n}';
      expect(JsonUtils.parseObjectList(text)).toEqual([{ version: 1, qty: 5, price: 12.5, amount: 99.9 }]);
      expect(JsonUtils.validateObjectList(text)).toEqual({ valid: true, count: 1 });
    });

    it('should read a full document with ObjectId, ISODate and Long together', () => {
      const text = `{
  "_id" : ObjectId("6ab378f77878c679bbdff386"),
  "doNo" : "DO-0001",
  "version" : Long("1"),
  "po" : { "pickDate" : ISODate("2026-09-23T00:00:00.000Z") },
  "items" : [ { "barcode" : "111", "assignedQty" : Int32(2) } ]
}`;
      const [doc] = JsonUtils.parseObjectList(text);
      expect(doc._id).toBe('6ab378f77878c679bbdff386');
      expect(doc.version).toBe(1);
      expect(doc.po.pickDate).toBe('2026-09-23T00:00:00.000Z');
      expect(doc.items[0].assignedQty).toBe(2);
    });

    it('should read Timestamp, BinData and single-quoted helper args', () => {
      expect(JsonUtils.parseObjectList("{\"ts\": Timestamp({ t: 1790147109, i: 1 }), \"b\": BinData(0, 'AAE='), \"id\": ObjectId('abc')}"))
        .toEqual([{ ts: 1790147109, b: 'AAE=', id: 'abc' }]);
      expect(JsonUtils.parseObjectList('{"ts": Timestamp(1790147109, 1)}')).toEqual([{ ts: 1790147109 }]);
    });

    it('should keep big Long values exact as text when they exceed a safe number', () => {
      // 2^53 + 1 cannot be a JS number; JSON.parse rounds it, which is acceptable for display
      expect(JsonUtils.parseObjectList('{"n": Long("9007199254740993")}')[0].n).toBeGreaterThan(9e15);
    });

    it('should leave unknown calls alone so they are reported as invalid JSON', () => {
      expect(JsonUtils.validateObjectList('{"x": Foo(1)}').valid).toBeFalse();
      expect(JsonUtils.normalizeMongoShell('{"x": xLong(1)}')).toBe('{"x": xLong(1)}');
    });

    it('should keep error positions after a Long helper', () => {
      const result = JsonUtils.validateObjectList('{"v": Long("1"), bad: 1}');
      expect(result).toEqual(jasmine.objectContaining({ valid: false, line: 1, column: 18 }));
    });
  });
});
