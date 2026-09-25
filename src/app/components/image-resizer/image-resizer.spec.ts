import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';
import { ImageResizer } from './image-resizer';

describe('ImageResizer', () => {
  let fixture: ComponentFixture<ImageResizer>;
  let component: ImageResizer;
  let el: HTMLElement;

  /** A real PNG of the given size, drawn on a canvas */
  const makeImage = (width: number, height: number, name = 'test.png') =>
    new Promise<File>(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.fillRect(0, 0, width, height);
      canvas.toBlob(blob => resolve(new File([blob!], name, { type: 'image/png' })), 'image/png');
    });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageResizer],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    }).compileComponents();
    fixture = TestBed.createComponent(ImageResizer);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should start from the first image size and keep the ratio when typing', async () => {
    await component.addFiles([await makeImage(400, 200)]);
    expect(component.form.value).toEqual(jasmine.objectContaining({ width: 400, height: 200 }));
    component.form.controls.width.setValue(100);
    expect(component.form.value.height).toBe(50);
  });

  it('should resize and convert to JPG', async () => {
    await component.addFiles([await makeImage(400, 200)]);
    component.form.patchValue({ width: 100 });
    component.setFormat('image/jpeg');
    await component.resizeAll();
    fixture.detectChanges();

    const result = component.items[0].result!;
    expect(result.size).toEqual({ width: 100, height: 50 });
    expect(result.blob.type).toBe('image/jpeg');
    expect(result.name).toBe('test-100x50.jpg');
    expect(el.querySelector('.ir-size')?.textContent).toContain('JPG 100×50');
  });

  it('should keep the size when only converting', async () => {
    await component.addFiles([await makeImage(30, 20)]);
    await component.resizeAll();
    expect(component.items[0].result!.size).toEqual({ width: 30, height: 20 });
  });

  it('should drop results when options change and clear everything', async () => {
    await component.addFiles([await makeImage(30, 20)]);
    await component.resizeAll();
    component.form.patchValue({ width: 10 });
    expect(component.hasResults).toBeFalse();

    component.clear();
    expect(component.items.length).toBe(0);
  });

  it('should convert a PNG to GIF', async () => {
    await component.addFiles([await makeImage(40, 20)]);
    component.setFormat('image/gif');
    await component.resizeAll();
    expect(component.items[0].result!.blob.type).toBe('image/gif');
    expect(component.items[0].result!.name).toBe('test-40x20.gif');
  });

  it('should give one image its own size while the others follow the panel', async () => {
    await component.addFiles([await makeImage(400, 200, 'a.png'), await makeImage(100, 100, 'b.png')]);
    component.form.patchValue({ width: 200, height: null });
    const [a, b] = component.items;
    component.setCustomSize(b, 'width', '50');
    expect(component.targetSize(a)).toEqual({ width: 200, height: 100 });
    expect(component.targetSize(b)).toEqual({ width: 50, height: 50 });
    expect(component.customCount).toBe(1);

    await component.resizeAll();
    expect(b.result!.size).toEqual({ width: 50, height: 50 });

    component.resetCustomSize(b);
    expect(component.targetSize(b)).toEqual({ width: 100, height: 100 }); // not enlarged past 100×100
  });

  it('should preview only the converted image and close on Escape', async () => {
    await component.addFiles([await makeImage(400, 200)]);
    component.form.patchValue({ width: 100 });
    await component.openPreview(component.items[0]);
    fixture.detectChanges();
    expect(el.querySelector('.ir-preview-stats')?.textContent).toContain('PNG 100×50');
    expect(el.querySelectorAll('.ir-preview-view img').length).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.ir-preview')).toBeNull();
  });

  it('should let one image be unlocked and sized freely without rewriting its inputs', async () => {
    await component.addFiles([await makeImage(400, 400, 'square.png')]);
    const [item] = component.items;
    component.setCustomSize(item, 'width', '200');
    expect(component.enteredSize(item)).toEqual({ width: 200, height: 200 });

    component.setCustomSize(item, 'height', '100'); // locked: width follows
    expect(component.enteredSize(item)).toEqual({ width: 100, height: 100 });

    component.toggleKeepRatio(item);
    component.setCustomSize(item, 'width', '300');
    expect(component.enteredSize(item)).toEqual({ width: 300, height: 100 });
    expect(component.targetSize(item)).toEqual({ width: 300, height: 100 });
    expect(component.form.value.keepAspectRatio).toBeTrue(); // the panel is untouched
  });

  it('should keep typed values and explain a no-enlarge clamp', async () => {
    await component.addFiles([await makeImage(100, 50)]);
    const [item] = component.items;
    component.setCustomSize(item, 'width', '400');
    fixture.detectChanges();
    expect((el.querySelector('.ir-own-size input') as HTMLInputElement).value).toBe('400');
    expect(el.querySelector('.ir-size-note')?.textContent).toContain('ไม่ขยายเกินต้นฉบับ');
  });

  it('should re-render the preview live when its size changes', async () => {
    await component.addFiles([await makeImage(400, 200)]);
    const [item] = component.items;
    await component.openPreview(item);
    component.setCustomSize(item, 'width', '100');
    expect(component.preview).toBe(item); // stays open while re-rendering
    for (let wait = 0; wait < 60 && item.result?.size.width !== 100; wait++) {
      await new Promise(resolve => setTimeout(resolve, 50)); // debounce + encode
    }
    expect(item.result!.size).toEqual({ width: 100, height: 50 });
  });
});
