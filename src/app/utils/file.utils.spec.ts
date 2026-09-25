import { FileUtils } from './file.utils';

describe('FileUtils', () => {
  it('should build a timestamped file name', () => {
    const name = FileUtils.timestampedName('payload', 'json', new Date(2026, 8, 3, 7, 5, 9));
    expect(name).toBe('payload-20260903-070509.json');
  });

  it('should download content through a temporary link', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');

    FileUtils.download('hello', 'out.txt');

    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
