import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';
import { PdfConverter } from './pdf-converter';

describe('PdfConverter', () => {
  let fixture: ComponentFixture<PdfConverter>;
  let component: PdfConverter;
  let el: HTMLElement;

  const makeImage = (width: number, height: number, name = 'test.png') =>
    new Promise<File>(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.fillRect(0, 0, width, height);
      canvas.toBlob(blob => resolve(new File([blob!], name, { type: 'image/png' })), 'image/png');
    });

  beforeEach(async () => {
    localStorage.removeItem('pdfConverter.section');
    await TestBed.configureTestingModule({
      imports: [PdfConverter],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    }).compileComponents();
    fixture = TestBed.createComponent(PdfConverter);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should open on PDF → Image and remember the section', () => {
    expect(component.section).toBe('toImage');
    component.setSection('toPdf');
    expect(localStorage.getItem('pdfConverter.section')).toBe('toPdf');
  });

  it('should add images in order and reorder them', async () => {
    component.setSection('toPdf');
    await component.addImages([await makeImage(10, 10, 'a.png'), await makeImage(20, 10, 'b.png')]);
    component.move(0, 1);
    fixture.detectChanges();
    expect(component.images.map(image => image.file.name)).toEqual(['b.png', 'a.png']);
    expect(el.querySelector('.ir-name')?.textContent).toContain('1. b.png');
  });

  it('should build and download one PDF', async () => {
    const download = spyOn(HTMLAnchorElement.prototype, 'click');
    component.setSection('toPdf');
    await component.addImages([await makeImage(30, 20)]);
    await component.buildPdf();
    expect(download).toHaveBeenCalled();
  });
});
