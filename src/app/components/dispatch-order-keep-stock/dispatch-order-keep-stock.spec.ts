import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchOrderKeepStock } from './dispatch-order-keep-stock';

describe('DispatchOrderKeepStock', () => {
  let component: DispatchOrderKeepStock;
  let fixture: ComponentFixture<DispatchOrderKeepStock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispatchOrderKeepStock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispatchOrderKeepStock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
