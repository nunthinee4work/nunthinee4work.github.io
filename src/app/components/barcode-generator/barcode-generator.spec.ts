import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarcodeGenerator } from './barcode-generator';

describe('UnicodeConverter', () => {
  let component: BarcodeGenerator;
  let fixture: ComponentFixture<BarcodeGenerator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarcodeGenerator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarcodeGenerator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
