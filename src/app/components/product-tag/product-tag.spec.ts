import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';

import { ProductTag } from './product-tag';

describe('ProductTag', () => {
  let component: ProductTag;
  let fixture: ComponentFixture<ProductTag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductTag],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductTag);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
