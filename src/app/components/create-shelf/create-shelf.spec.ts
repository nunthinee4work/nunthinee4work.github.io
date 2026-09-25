import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';

import { CreateShelf } from './create-shelf';

describe('CreateShelf', () => {
  let component: CreateShelf;
  let fixture: ComponentFixture<CreateShelf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateShelf],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateShelf);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
