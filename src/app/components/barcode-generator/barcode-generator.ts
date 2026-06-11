import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  QueryList,
  ViewChildren
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import JsBarcode from 'jsbarcode';
import { CopyButton } from "../../shared/copy-button/copy-button";

interface BarcodeItem {
  productName?: string;
  barcode: string;
  barSize?: string;
}

@Component({
  selector: 'app-barcode-generator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton
],
  templateUrl: './barcode-generator.html',
  styleUrls: ['./barcode-generator.scss']
})
export class BarcodeGenerator implements AfterViewInit {

  form: FormGroup;

  barcodes: BarcodeItem[] = [];

  @ViewChildren('barcodeSvg')
  barcodeSvgs!: QueryList<ElementRef<SVGSVGElement>>;

  constructor(private fb: FormBuilder) {

    this.form = this.fb.group({
      inputBarcodes: ['']
    });

  }

  ngAfterViewInit() {

    this.barcodeSvgs.changes.subscribe(() => {
      this.renderBarcodes();
    });

  }

  showBarcodes(): void {

    const input = this.form.get('inputBarcodes')?.value || '';

    this.barcodes = input
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((line: string) => {

        const parts = line.split(/\s+/);

        if (parts.length === 1) {
          return {
            barcode: parts[0]
          };
        }

        return {
          productName: parts.slice(0, -2).join(' '),
          barcode: parts[parts.length - 2],
          barSize: parts[parts.length - 1]
        };

      });

  }

  private renderBarcodes(): void {

    this.barcodeSvgs.forEach((svgRef, index) => {

      const item = this.barcodes[index];

      JsBarcode(svgRef.nativeElement, item.barcode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        lineColor: '#000'
      });

    });

  }

}