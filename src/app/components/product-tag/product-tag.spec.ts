import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductTag } from './product-tag';

describe('ProductTag', () => {
  let component: ProductTag;
  let fixture: ComponentFixture<ProductTag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductTag]
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
