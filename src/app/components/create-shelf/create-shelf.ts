import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { CodeBox } from '../../shared/code-box/code-box';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-shelf',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
    CopyButton,
    CodeBox
  ],
  templateUrl: './create-shelf.html',
  styleUrl: './create-shelf.scss'
})
export class CreateShelf {

  shelfForm!: FormGroup;

    constructor(private fb: FormBuilder,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const now = new Date()
    this.shelfForm = this.fb.group({
      productData : [],
    })
  }

  exportToExcel(data: any[], fileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Refill Plan': worksheet },
      SheetNames: ['Refill Plan']
    };
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  onSubmit(){

  }

  clearData(){

  }
}
