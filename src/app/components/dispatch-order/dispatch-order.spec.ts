import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchOrderCrossDock } from './dispatch-order-cross-dock';

describe('DispatchOrderCrossDock', () => {
  let component: DispatchOrderCrossDock;
  let fixture: ComponentFixture<DispatchOrderCrossDock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispatchOrderCrossDock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispatchOrderCrossDock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
