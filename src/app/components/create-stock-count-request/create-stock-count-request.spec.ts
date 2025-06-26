import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateStockCountRequest } from './create-stock-count-request';

describe('CreateStockCountRequest', () => {
  let component: CreateStockCountRequest;
  let fixture: ComponentFixture<CreateStockCountRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStockCountRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateStockCountRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
