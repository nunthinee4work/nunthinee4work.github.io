import { ImageResizeUtils, ResizeOptions } from './image-resize.utils';

describe('ImageResizeUtils', () => {
  const photo = { width: 4000, height: 3000 };
  const options = (overrides: Partial<ResizeOptions>): ResizeOptions =>
    ({ width: null, height: null, keepAspectRatio: true, noEnlarge: true, ...overrides });

  it('should keep the original size when both sides are blank', () => {
    expect(ImageResizeUtils.targetSize(photo, options({}))).toEqual(photo);
  });

  it('should derive the blank side from the aspect ratio', () => {
    expect(ImageResizeUtils.targetSize(photo, options({ width: 800 }))).toEqual({ width: 800, height: 600 });
    expect(ImageResizeUtils.targetSize(photo, options({ height: 300 }))).toEqual({ width: 400, height: 300 });
  });

  it('should fit inside the box when the ratio is locked', () => {
    expect(ImageResizeUtils.targetSize(photo, options({ width: 1000, height: 1000 }))).toEqual({ width: 1000, height: 750 });
  });

  it('should stretch to the exact size when the ratio is not kept', () => {
    expect(ImageResizeUtils.targetSize(photo, options({ width: 1000, height: 1000, keepAspectRatio: false })))
      .toEqual({ width: 1000, height: 1000 });
  });

  it('should not enlarge a smaller image unless allowed', () => {
    const icon = { width: 100, height: 50 };
    expect(ImageResizeUtils.targetSize(icon, options({ width: 400 }))).toEqual(icon);
    expect(ImageResizeUtils.targetSize(icon, options({ width: 400, noEnlarge: false }))).toEqual({ width: 400, height: 200 });
    expect(ImageResizeUtils.targetSize(icon, options({ width: 400, height: 20, keepAspectRatio: false })))
      .toEqual({ width: 100, height: 20 });
  });

  it('should pick the output type', () => {
    expect(ImageResizeUtils.outputType('image/png')).toBe('image/png');
    expect(ImageResizeUtils.outputType('image/gif')).toBe('image/gif');
    expect(ImageResizeUtils.outputType('image/webp')).toBe('image/png');
    expect(ImageResizeUtils.outputType('image/png', 'image/jpeg')).toBe('image/jpeg');
  });

  it('should name the output after size and type', () => {
    expect(ImageResizeUtils.outputName('photo.jpeg', { width: 800, height: 600 }, 'image/jpeg')).toBe('photo-800x600.jpg');
    expect(ImageResizeUtils.outputName('photo.png', { width: 80, height: 60 }, 'image/svg+xml')).toBe('photo-80x60.svg');
  });

  it('should compute the proportional other side', () => {
    expect(ImageResizeUtils.proportional(photo, 'width', 800)).toBe(600);
    expect(ImageResizeUtils.proportional(photo, 'height', 300)).toBe(400);
  });

  it('should label types for the UI', () => {
    expect(ImageResizeUtils.label('image/jpeg')).toBe('JPG');
    expect(ImageResizeUtils.label('image/svg+xml')).toBe('SVG');
  });

  it('should encode a GIF keeping transparent pixels', async () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]); // red, transparent
    const bytes = new Uint8Array(await ImageResizeUtils.encodeGif(new ImageData(pixels, 2, 1)).arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/gif' }));
    expect([image.width, image.height]).toEqual([2, 1]);
  });

  it('should embed a raster as PNG inside an SVG', async () => {
    const svg = await (await ImageResizeUtils.embedInSvg(new Blob([new Uint8Array([1, 2, 3])]), { width: 40, height: 30 })).text();
    expect(svg).toContain('width="40" height="30" viewBox="0 0 40 30"');
    expect(svg).toContain('href="data:image/png;base64,AQID"');
  });

  it('should resize an SVG as vector', async () => {
    const file = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50"/></svg>'], { type: 'image/svg+xml' });
    const svg = await (await ImageResizeUtils.resizeSvg(file, { width: 100, height: 50 }, { width: 200, height: 100 }, false)).text();
    expect(svg).toContain('width="200"');
    expect(svg).toContain('viewBox="0 0 100 50"');
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('preserveAspectRatio');
  });

  it('should load an SVG file', async () => {
    const file = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"/>'], { type: 'image/svg+xml' });
    const bitmap = await ImageResizeUtils.load(file);
    expect([bitmap.width, bitmap.height]).toEqual([120, 80]);
  });
});
