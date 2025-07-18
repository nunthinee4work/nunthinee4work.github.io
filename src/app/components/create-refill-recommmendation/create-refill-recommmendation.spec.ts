import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateRefillRecommmendation } from './create-refill-recommmendation';

describe('CreateRefillRecommmendation', () => {
  let component: CreateRefillRecommmendation;
  let fixture: ComponentFixture<CreateRefillRecommmendation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRefillRecommmendation]
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
