import { NgSelectComponent } from '@ng-select/ng-select';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { DateUtils } from '../../utils/date.utils';

@Component({
  selector: 'app-dispatch-order-cross-dock',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
  ],
  templateUrl: './dispatch-order-cross-dock.html',
  styleUrls: ['./dispatch-order-cross-dock.scss']
})
export class DispatchOrderCrossDock implements OnInit {

  dispatchForm!: FormGroup;
  toteForm!: FormGroup;
  dateUtils: DateUtils = new DateUtils()

  constructor(private fb: FormBuilder,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const now = new Date()
    this.dispatchForm = this.fb.group({
      deliveryOrder: [''],
      packingOption: ['RANDOM_TOTE'],
      randomToteCode: [''],
      startRandomRunningNumber: [''],
      toteId: [''],
      prefixTote: [''],
      toteCode: [''],
      startRunningNumber: [''],
      platNo: ['Truck@Galaxy', Validators.required],
      driverName: ['Dominic Toretto', Validators.required],
      priceDate: [now.toISOString().split('T')[0], Validators.required],
    });

    this.toteForm = this.fb.group({
      items: this.fb.array([])
    });
  }

  get items(): FormArray {
    return this.toteForm.get('items') as FormArray;
  }

  createItemForm(product: any): FormGroup {
    return this.fb.group({
      productName: [product.productName],
      barcode: [product.barcode],
      assignedQty: [product.assignedQty],
      pickQty: [''],
      toteId: ['']
    });
  }

  createItem(productName: string, barcode: string, assignedQty: number, unit: string): FormGroup {
    return this.fb.group({
      productName: [productName],
      barcode: [barcode],
      assignedQty: [assignedQty],
      details: this.fb.array([this.createDetail(assignedQty, unit)])
    });
  }

  createDetail(pickedQty?: number, unit?: string): FormGroup {
    return this.fb.group({
      pickQty: [pickedQty, Validators.required],
      toteId: ['', Validators.required],
      unit: [unit]
    });
  }

  get f() {
    return this.dispatchForm.controls;
  }

  packingOptions = [
    { id: 'RANDOM_TOTE', name: 'Random tote prefix' },
    { id: 'SEPARATE_TOTE', name: 'Set tote prefix based on no of items' },
    { id: 'ONE_TOTE', name: 'Single tote for all products' }
  ];

  onChangedPackingOption(): void {
    this.mapToteDetail()
  }

  onChangedInputDelivery(): void {
    this.mapToteDetail()
  }

  mapToteDetail(): void {
    const packingOption = this.dispatchForm.get('packingOption')?.value ?? ''
    if (packingOption != 'SEPARATE_TOTE') {
      return;
    }

    const inputDeliveryOrderString = this.dispatchForm.get('deliveryOrder')?.value ?? '';
    let inputDeliveryOrderObj: any = null;

    try {
      inputDeliveryOrderObj = JSON.parse(inputDeliveryOrderString);
    } catch (e) {
      this.toastr.error('JSON parse error:');
      inputDeliveryOrderObj = null;
    }

    if (inputDeliveryOrderObj && Array.isArray(inputDeliveryOrderObj.items)) {
      const items = inputDeliveryOrderObj.items;
      this.items.clear();

      if (items && Array.isArray(items)) {
        items.forEach(item => {
          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.barcode ?? '',
              item.assignedQty ?? 0,
              item.crossDock.unit ?? ''
            )
          );
        });
      }
    } else {
      console.warn('Invalid delivery order or items missing');
    }
  }

  getDetails(index: number): FormArray {
    return this.items.at(index).get('details') as FormArray;
  }

  addDetail(itemIndex: number): void {
    this.getDetails(itemIndex).push(this.createDetail());
  }

  removeDetail(itemIndex: number, detailIndex: number): void {
    const details = this.getDetails(itemIndex);
    if (details.length > 1) {
      details.removeAt(detailIndex);
    } else {
      this.toastr.warning('ต้องมี Pick Detail อย่างน้อย 1 รายการ', 'แจ้งเตือน');
    }
  }

  onSubmit() {
    if (this.dispatchForm.invalid || this.toteForm.invalid) {
      // mark all fields as touched เพื่อแสดง error message
      this.dispatchForm.markAllAsTouched();
      if (this.dispatchForm.get('packingOption')?.value == 'SEPARATE_TOTE') {
        this.toteForm.markAllAsTouched();
      }
      return;
    }

    const dispatchValue = this.dispatchForm.value
    const toteValue = this.toteForm.value

    const headers: string[] = [
      "01", "shipmentNo", "doNo", "barcode", "pickedQty", "uom", "toteId", "deliverydate",
      "pickupdate", "couriercode", "couriername", "drivername", "truckId", "plateno",
      "loadingNo", "priceDate", "expDate", "mfgDate", "recDate", "lotNo"
    ];

    // ดึงค่าจาก formControl
    let deliveryOrder: any;
    try {
      deliveryOrder = JSON.parse(dispatchValue.deliveryOrder);
    } catch (e) {
      this.toastr.error('Invalid JSON input');
      return;
    }

    const now = new Date();
    const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.cutOffDeliveryDate));
    const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.pickDate));
    const currentDate = now.toISOString().split('T')[0]
    const expDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    const toteFormData = this.toteForm.value;
    const toteItems = toteFormData.items;
    const plateNo = this.dispatchForm.get('platNo')?.value ?? '';
    const driverName = this.dispatchForm.get('driverName')?.value ?? '';
    const priceDate = this.dispatchForm.get('priceDate')?.value ?? '';

    if (!deliveryOrder?.items || !Array.isArray(deliveryOrder.items)) {
      this.toastr.error('Invalid deliveryOrder structure: missing items array', 'แจ้งเตือน');
      return;
    }

    const itemCount: number = toteItems.length
    //TODO
    // const toteIdList: string[] = this.generateToteIdList(itemCount);

    const rows: (string | number)[][] = [];
    const toteMap: Map<string, string[]> = new Map();

    for (let i = 0; i < itemCount; i++) {
      const doItem = toteItems[i]//deliveryOrder.items[i];

      if (doItem.details) {
        for (let j = 0; j < doItem.details.length; j++) {
          const item = doItem.details[j]
          rows.push([
            "01",
            `SO-${deliveryOrder.doNo}`,
            deliveryOrder.doNo,
            doItem.barcode,
            (Number(item.pickQty ?? 0)).toFixed(2),
            item.unit ?? "",
            //TODO
            item.toteId,
            deliveryDate,
            pickDate,
            "",
            "",
            driverName,
            plateNo,
            "",
            `LD${this.dateUtils.generateCompactDateTime(now)}`,
            priceDate === null || priceDate === '' ? 'YYYY-MM-DD' : priceDate,
            expDate,
            currentDate,
            currentDate,
            `LTEST-${deliveryOrder.doNo.split('-').slice(1).join('-')}`
          ]);
        }
      }

      let productName: string = doItem.productName ?? "";

      if (productName.includes(",")) {
        productName = `"${productName}"`;
      }

      const barcode: string = doItem.barcode;
      //TODO
      // const toteId: string = toteIdList[i];

      // if (!toteMap.has(toteId)) {
      //   toteMap.set(toteId, []);
      // }
      // toteMap.get(toteId)!.push(barcode);
    }

    // console.log(rows)
    const csvArray = [headers, ...rows];

    const csvContent = csvArray
      .map(row => {
        while (row.length > 1 && row[row.length - 1] === "") {
          row.pop();
        }
        return row.join("|");
      })
      .join("\n");

    const BOM = "\uFEFF";

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shipment_${deliveryOrder.doNo}.csv`;
    link.click();

    // this.renderToteTable(toteMap);
  }
}
