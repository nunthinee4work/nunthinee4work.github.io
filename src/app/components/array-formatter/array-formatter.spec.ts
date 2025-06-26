import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArrayFormatter } from './array-formatter';

describe('ArrayFormatter', () => {
  let component: ArrayFormatter;
  let fixture: ComponentFixture<ArrayFormatter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArrayFormatter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArrayFormatter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
