import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';

import { CreateRefillRecommmendation } from './create-refill-recommmendation';

describe('CreateRefillRecommmendation', () => {
  let component: CreateRefillRecommmendation;
  let fixture: ComponentFixture<CreateRefillRecommmendation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRefillRecommmendation],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateRefillRecommmendation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
