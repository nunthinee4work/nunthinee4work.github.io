import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';

@Component({
  selector: 'app-create-stock-count-group',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton
  ],
  templateUrl: './create-stock-count-group.html',
  styleUrl: './create-stock-count-group.scss'
})
export class CreateStockCountGroup {

}
