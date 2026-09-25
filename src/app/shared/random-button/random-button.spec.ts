import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RandomButton } from './random-button';

describe('RandomButton', () => {
  let component: RandomButton;
  let fixture: ComponentFixture<RandomButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RandomButton],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RandomButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
