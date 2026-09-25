import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnicodeConverter } from './unicode-converter';

describe('UnicodeConverter', () => {
  let component: UnicodeConverter;
  let fixture: ComponentFixture<UnicodeConverter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnicodeConverter],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnicodeConverter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
