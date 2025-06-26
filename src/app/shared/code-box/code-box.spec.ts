import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeBox } from './code-box';

describe('CodeBox', () => {
  let component: CodeBox;
  let fixture: ComponentFixture<CodeBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeBox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
