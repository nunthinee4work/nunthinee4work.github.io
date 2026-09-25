import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarcodeGenerator } from './barcode-generator';

describe('BarcodeGenerator', () => {
  let component: BarcodeGenerator;
  let fixture: ComponentFixture<BarcodeGenerator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarcodeGenerator],
      providers: [provideZonelessChangeDetection()]
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
