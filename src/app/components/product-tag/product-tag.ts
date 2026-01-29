import { routes } from './../../app.routes';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { CodeBox } from '../../shared/code-box/code-box';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { ToastrService } from 'ngx-toastr';
import QRCode from "qrcode";

@Component({
  selector: 'app-product-tag',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
    CopyButton,
    CodeBox
  ],
  templateUrl: './product-tag.html',
  styleUrl: './product-tag.scss'
})
export class ProductTag {

  productTagForm!: FormGroup;
  qrText: string = '';
  phraseResult: any = '';

  types = [
    { id: 'REGULAR', name: 'Regular' },
    { id: 'PROMOTION', name: 'Promotion' },
    { id: 'RTC', name: 'RTC' }
  ];

  constructor(private fb: FormBuilder,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {

    const now = new Date()
    this.productTagForm = this.fb.group({
      type: [null, Validators.required],
      articleNo: ['', Validators.required],
      barcode: ['', Validators.required],
      shelf: [''],
      masterId: ['', Validators.required],
      version: ['', Validators.required],
      bayNo: [''],
      bayLevel: [''],
      locationId: [''],
      docRefNo: [''],
      expireDate: [''],
      productTagData: [''],
    })

    this.productTagForm.get('type')?.valueChanges.subscribe(type => {
      const articleNoControl = this.productTagForm.get('articleNo');
      const barcodeControl = this.productTagForm.get('barcode');
      const masterIdControl = this.productTagForm.get('masterId');
      const versionControl = this.productTagForm.get('version');
      const docRefNoControl = this.productTagForm.get('docRefNo');
      const expireDateControl = this.productTagForm.get('expireDate');
      const shelfControl = this.productTagForm.get('shelf');

      if (type === 'REGULAR') {
        articleNoControl?.setValidators([Validators.required]);
        barcodeControl?.setValidators([Validators.required]);
        masterIdControl?.setValidators([Validators.required]);
        versionControl?.setValidators([Validators.required]);

        docRefNoControl?.clearValidators();
        expireDateControl?.clearValidators();
        shelfControl?.clearValidators();
      } else if (type === 'PROMOTION') {
        barcodeControl?.setValidators([Validators.required]);
        docRefNoControl?.setValidators([Validators.required]);
        shelfControl?.setValidators([Validators.required]);

        articleNoControl?.clearValidators();
        masterIdControl?.clearValidators();
        versionControl?.clearValidators();
        expireDateControl?.clearValidators();
      } else if (type === 'RTC') {
        docRefNoControl?.setValidators([Validators.required]);
        expireDateControl?.setValidators([Validators.required]);

        articleNoControl?.clearValidators();
        barcodeControl?.clearValidators();
        shelfControl?.clearValidators();
        masterIdControl?.clearValidators();
        versionControl?.clearValidators();
      }

      const qrDiv = document.getElementById("qrContainer")
      if (qrDiv) {
        this.qrText = ''
        qrDiv.innerHTML = ""
      }

      articleNoControl?.updateValueAndValidity();
      barcodeControl?.updateValueAndValidity();
      shelfControl?.updateValueAndValidity();
      masterIdControl?.updateValueAndValidity();
      versionControl?.updateValueAndValidity();
      docRefNoControl?.updateValueAndValidity();
      expireDateControl?.updateValueAndValidity();
    })
  }

  appendText(sb: string[], fieldNo: QrCodeDescription, value: string | undefined | null) {
    if (value != null) {
      sb.push(`${fieldNo}${String(value).length.toString().padStart(2, "0")}${value}`);
    }
  }

  buildBayInfo(
    bayNo?: string | null,
    bayLevel?: string | null,
    locationId?: string | null
  ): string | null {
    if (!bayNo || !bayLevel || locationId == null) {
      return null;
    }
    return `${bayNo},${bayLevel},${locationId}`;
  }

  generateRegularTag(data: PriceTagPrintProjection): string {
    const sb: string[] = [];

    this.appendText(sb, QrCodeDescription.PRODUCT_TAG_TYPE, "01");
    this.appendText(sb, QrCodeDescription.ARTICLE_NO, data.articleNo);
    this.appendText(sb, QrCodeDescription.BARCODE, data.barcode);
    this.appendText(sb, QrCodeDescription.SHELF_NO, data.shelf);
    this.appendText(sb, QrCodeDescription.MASTER_ID, data.masterId.toString());
    this.appendText(sb, QrCodeDescription.VERSION, data.version.toString());
    this.appendText(sb, QrCodeDescription.BAY_INFO, this.buildBayInfo(data.bayNo, data.bayLevel, data.locationId));

    return sb.join("");
  }

  generatePromotionTag(data: PriceTagPrintProjection): string {
    const sb: string[] = [];

    this.appendText(sb, QrCodeDescription.PRODUCT_TAG_TYPE, "02");
    this.appendText(sb, QrCodeDescription.BARCODE, data.barcode);
    this.appendText(sb, QrCodeDescription.DOC_REF_NO, data.docRefNo);
    this.appendText(sb, QrCodeDescription.SHELF_NO, data.shelf);
    this.appendText(sb, QrCodeDescription.BAY_INFO, this.buildBayInfo(data.bayNo, data.bayLevel, data.locationId));

    return sb.join("");
  }

  generateReduceToClearTag(data: PriceTagPrintProjection): string {
    const sb: string[] = [];

    this.appendText(sb, QrCodeDescription.PRODUCT_TAG_TYPE, "03");
    this.appendText(sb, QrCodeDescription.DOC_REF_NO, data.docRefNo);
    this.appendText(sb, QrCodeDescription.EXPIRE_DATE, this.transformDate(data.expireDate));

    return sb.join("");
  }

  async generateTagQRCode(): Promise<void> {
    if (this.validateForm()) {
      return;
    }

    const formData = this.productTagForm.value;
    const qrDiv = document.getElementById("qrContainer");

    if (formData.type === 'REGULAR') {
      this.qrText = this.generateRegularTag(formData);
    } else if (formData.type === 'PROMOTION') {
      this.qrText = this.generatePromotionTag(formData);
    } else if (formData.type === 'RTC') {
      this.qrText = this.generateReduceToClearTag(formData);
    } else {
      this.qrText = '';
      if (qrDiv) {
        qrDiv.innerHTML = "";
      }
      return;
    }

    const qrDataUrl = await generateQRCode(this.qrText);
    if (qrDiv) {
      qrDiv.innerHTML = "";
      const img = document.createElement("img");
      img.src = qrDataUrl;
      qrDiv.appendChild(img);
    }
  }

  validateForm(): boolean {
    if (this.productTagForm.invalid || this.productTagForm.invalid) {
      this.productTagForm.markAllAsTouched();
      this.toastr.error('Invalid form', 'แจ้งเตือน');
      console.log(this.productTagForm)
      return true
    }
    return false
  }

  transformDate(input: string): string {
    const cleaned = input.replace(/\.\d+|\s\+\d{4}/g, ""); // "11292025-01-25 23:59:59"
    const [datePart, timePart] = cleaned.split(" ");
    const [yearPart, monthPart, dayPart] = datePart.split("-");
    const [hour, minute, second] = timePart.split(":");
    return `${dayPart}${monthPart}${yearPart}${hour}${minute}${second}`;
  }

  phraseProductTag() {
    const formData = this.productTagForm.value;
    const manager = new BarcodeScanValidateManager();
    this.phraseResult = manager.validateBarcode(formData.productTagData);
  }
}

export interface PriceTagPrintProjection {
  articleNo: string;
  barcode: string;
  shelf: string;
  masterId: number | string;
  version: number | string;
  bayNo?: string;
  bayLevel?: string;
  locationId?: string;
  docRefNo?: string;
  expireDate: string;
}

export enum QrCodeDescription {
  PRODUCT_TAG_TYPE = "01",
  PRODUCT_NAME = "02",
  ARTICLE_NO = "03",
  BARCODE = "04",
  UNIT = "05",
  RETAIL_PRICE = "06",
  DOC_REF_NO = "07",
  PROMOTION_NAME = "08",
  PROMOTION_PRICE = "09",
  EFFECTIVE_DATE = "10",
  EXPIRE_DATE = "11",
  SHELF_NO = "12",
  MASTER_ID = "13",
  VERSION = "14",
  SHELF_LABEL = "15",
  TOTE_ID = "16",
  BAY_INFO = "17",
}

export async function generateQRCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 2,
      width: 300,
    });
    return dataUrl;
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    throw err;
  }
}

export interface ScanValidateModel {
  type: "REGULAR" | "PROMOTION" | "REDUCE_TO_CLEAR" | "Normal";
  articleNo?: string;
  barcode?: string;
  unit?: string;
  retailPrice?: number;
  shelfNo?: string | null;
  masterId?: string;
  version?: string;
  shelfLabel?: string;
  promotionNo?: string;
  rtcUniqueCode?: string;
  expireDate?: string;
  bayNo?: string;
  bayLevel?: string;
  locationId?: string;
  plainText?: string;
}

export interface SplitTextResult {
  success: boolean;
  value?: Record<string, string>;
  error?: any;
}

export const BarcodeScanTagType = {
  REGULAR: { tagCode: "01" },
  PROMOTION: { tagCode: "02" },
  REDUCE_TO_CLEAR: { tagCode: "03" },
} as const;

export class BarcodeScanValidateManager {
  validateBarcode(plainText: string): ScanValidateModel {
    const splitTextResult = this.splitTextInputIntoField(plainText);
    return this.validateInputType(splitTextResult, plainText);
  }

  private validateInputType(
    splitTextResult: SplitTextResult,
    plainText: string
  ): ScanValidateModel {
    const result = splitTextResult.success ? splitTextResult.value! : null;
    const productTag = result?.[QrCodeDescription.PRODUCT_TAG_TYPE] || null;

    const bayInfo = result?.[QrCodeDescription.BAY_INFO] || "";
    const [bayNo, bayLevel, locationId] = bayInfo ? bayInfo.split(",") : ["", "", ""];

    if (productTag === BarcodeScanTagType.REGULAR.tagCode) {
      return {
        type: "REGULAR",
        articleNo: result?.[QrCodeDescription.ARTICLE_NO] || "",
        barcode: result?.[QrCodeDescription.BARCODE] || "",
        unit: result?.[QrCodeDescription.UNIT] || "",
        retailPrice: this.parseRetailPrice(result?.[QrCodeDescription.RETAIL_PRICE] || ""),
        shelfNo: result?.[QrCodeDescription.SHELF_NO] || null,
        masterId: result?.[QrCodeDescription.MASTER_ID] || "",
        version: result?.[QrCodeDescription.VERSION] || "",
        shelfLabel: result?.[QrCodeDescription.SHELF_LABEL] || "",
        bayNo: bayNo || "",
        bayLevel: bayLevel || "",
        locationId: locationId || "",
      };
    } else if (productTag === BarcodeScanTagType.PROMOTION.tagCode) {
      return {
        type: "PROMOTION",
        barcode: result?.[QrCodeDescription.BARCODE] || "",
        promotionNo: result?.[QrCodeDescription.DOC_REF_NO] || "",
        shelfNo: result?.[QrCodeDescription.SHELF_NO] || null,
        shelfLabel: result?.[QrCodeDescription.SHELF_LABEL] || "",
        bayNo: bayNo || "",
        bayLevel: bayLevel || "",
        locationId: locationId || "",
      };
    } else if (productTag === BarcodeScanTagType.REDUCE_TO_CLEAR.tagCode) {
      return {
        type: "REDUCE_TO_CLEAR",
        rtcUniqueCode: result?.[QrCodeDescription.DOC_REF_NO] || "",
        expireDate: result?.[QrCodeDescription.EXPIRE_DATE] || "",
      };
    } else {
      if (plainText.endsWith(".00")) {
        return {
          type: "REDUCE_TO_CLEAR",
          rtcUniqueCode: plainText,
        };
      } else {
        return {
          type: "Normal",
          plainText,
        };
      }
    }
  }

  private splitTextInputIntoField(barcode: string): SplitTextResult {
    let pivot = 0;
    try {
      const hashMap: Record<string, string> = {};
      while (pivot < barcode.length) {
        const fieldNo = barcode.substring(pivot, pivot + 2);
        pivot += 2;

        const fieldLength = parseInt(barcode.substring(pivot, pivot + 2), 10);
        pivot += 2;

        const text = barcode.substring(pivot, pivot + fieldLength);
        pivot += fieldLength;

        hashMap[fieldNo] = text;
      }
      return { success: true, value: hashMap };
    } catch (error) {
      return { success: false, error };
    }
  }

  private parseRetailPrice(rspText: string): number {
    if (!rspText || rspText.length === 0) return 0.0;
    const withDecimal = rspText.slice(0, -2) + "." + rspText.slice(-2);
    return parseFloat(parseFloat(withDecimal).toFixed(2));
  }
}