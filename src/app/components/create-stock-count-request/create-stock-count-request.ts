import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';

@Component({
  selector: 'app-create-stock-count-request',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton
  ],
  templateUrl: './create-stock-count-request.html',
  styleUrl: './create-stock-count-request.scss'
})
export class CreateStockCountRequest {
  stockCountForm!: FormGroup;
  stockCountRequestOutput: string = '';
  showInputStores = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.stockCountForm = this.fb.group({
      subject: ['', Validators.required],
      itemType: ['', Validators.required],
      inputSeparator: ['NEW_LINE'],
      inputCodes: ['', Validators.required],
      selectStore: ['', Validators.required],
      inputStores: [''],
    });

    this.stockCountForm.get('selectStore')?.valueChanges.subscribe((value) => {
      this.showInputStores = value === 'OTHER';
    });
  }

  generatePayload(): void {
    const formValue = this.stockCountForm.value;
    const separator = formValue.inputSeparator === 'NEW_LINE' ? '\n' : ',';
    const items = formValue.inputCodes
      .split(separator)
      .map((item: string) => item.trim())
      .filter((item: string) => item);

    let stores: string[] = [];
    switch (formValue.selectStore) {
      case 'DEAR':
        stores = ['PANDA01', 'PANDA02'];
        break;
      case 'TUNG':
        stores = ['CJX12491', 'CJX12492', 'CJX7777', 'PANDA01', 'PANDA02'];
        break;
      case 'ANDROID':
        stores = ['GX000001', 'GX999999'];
        break;
      case 'DEAR+ANDROID':
        stores = ['PANDA01', 'PANDA02', 'GX000001', 'GX999999'];
        break;
      case 'OTHER':
        stores = formValue.inputStores
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s);
        break;
    }

    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);
    startDate.setHours(startDate.getHours() + 1);
    const countStartDatetime = startDate.toISOString();

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
    const countEndDatetime = endDate.toISOString();

    const payload = {
      subject: formValue.subject,
      countStartDatetime,
      countEndDatetime,
      itemType: formValue.itemType,
      items,
      selectStore: 'SELECT_BY_STORE',
      storeCodes: stores,
    };

    this.stockCountRequestOutput = JSON.stringify(payload, null, 2);
  }

  clearForm(): void {
    this.stockCountForm.reset({ inputSeparator: 'NEW_LINE' });
    this.stockCountRequestOutput = '';
  }
}
