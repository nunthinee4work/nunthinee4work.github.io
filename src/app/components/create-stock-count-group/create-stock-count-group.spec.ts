import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateStockCountGroup } from './create-stock-count-group';

describe('CreateStockCountGroup', () => {
  let component: CreateStockCountGroup;
  let fixture: ComponentFixture<CreateStockCountGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStockCountGroup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateStockCountGroup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
