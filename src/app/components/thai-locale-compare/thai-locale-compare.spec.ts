import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThaiLocaleCompare } from './thai-locale-compare';

describe('ThaiLocaleCompare', () => {
  let component: ThaiLocaleCompare;
  let fixture: ComponentFixture<ThaiLocaleCompare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThaiLocaleCompare]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThaiLocaleCompare);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
