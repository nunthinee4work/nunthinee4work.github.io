import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateStockCountGroup } from './create-stock-count-group';

describe('CreateStockCountGroup', () => {
  let component: CreateStockCountGroup;
  let fixture: ComponentFixture<CreateStockCountGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStockCountGroup],
      providers: [provideZonelessChangeDetection()]
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
