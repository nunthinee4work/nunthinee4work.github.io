import { NgSelectComponent } from '@ng-select/ng-select';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { DateUtils } from '../../utils/date.utils';
declare var bootstrap: any;
@Component({
  selector: 'app-dispatch-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
  ],
  templateUrl: './dispatch-order.html',
  styleUrls: ['./dispatch-order.scss']
})
export class DispatchOrder implements OnInit, AfterViewInit {

  dispatchForm!: FormGroup;
  toteForm!: FormGroup;
  dateUtils: DateUtils = new DateUtils()
  toteIdList: string[] = [];
  deliveryOrderObject: any
  modal: any;
  confirmToteData: any
  confirmShipmentData: any

  modes = [
    { id: 'CUSTOM_TOTE', name: 'Custom Tote' },
    { id: 'RANDOM_TOTE', name: 'Random Tote' },
    { id: 'SINGLE_TOTE', name: 'Single tote for all products' }
  ];

  orderFlows = [
    { id: 'KEEP_STOCK', name: 'Keep Stock' },
    { id: 'CROSS_DOCK', name: 'Cross Dock' }
  ];

  prefixToteList: any[] = [
    { code: "BDG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "10" },
    { code: "BDP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "7" },
    { code: "BDR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "4" },
    { code: "BDS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "1" },
    { code: "BDB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "14" },
    { code: "BDT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "15" },
    { code: "BDY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "16" },
    { code: "BLG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "10" },
    { code: "BLP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "7" },
    { code: "BLR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "4" },
    { code: "BLS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "1" },
    { code: "BLB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "14" },
    { code: "BLT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "15" },
    { code: "BLY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "16" },
    { code: "BMG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "10" },
    { code: "BMP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "7" },
    { code: "BMR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "4" },
    { code: "BMS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "1" },
    { code: "BMB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "14" },
    { code: "BMT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "15" },
    { code: "BMY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "16" },
    { code: "BSG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "10" },
    { code: "BSP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "7" },
    { code: "BSR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "4" },
    { code: "BSS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "1" },
    { code: "BSB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "14" },
    { code: "BST", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "15" },
    { code: "BSY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "16" },
    { code: "BTG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "10" },
    { code: "BTP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "7" },
    { code: "BTR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "4" },
    { code: "BTS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "1" },
    { code: "BTB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "14" },
    { code: "BTT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "15" },
    { code: "BTY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "16" },
    { code: "BXG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "10" },
    { code: "BXP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "7" },
    { code: "BXR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "4" },
    { code: "BXS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "1" },
    { code: "BXB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "14" },
    { code: "BXT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "15" },
    { code: "BXY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "16" },
    { code: "PL", nameTh: "พลาสติก", toteGroup: "19" },
    { code: "TDG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "9" },
    { code: "TDP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "6" },
    { code: "TDR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "3" },
    { code: "TDS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "0" },
    { code: "TDB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "13" },
    { code: "TDT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "12" },
    { code: "TDY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "11" },
    { code: "TLG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "9" },
    { code: "TLP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "6" },
    { code: "TLR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "3" },
    { code: "TLS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "0" },
    { code: "TLB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "13" },
    { code: "TLT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "12" },
    { code: "TLY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "11" },
    { code: "TMG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "9" },
    { code: "TMP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "6" },
    { code: "TMR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "3" },
    { code: "TMS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "0" },
    { code: "TMB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "13" },
    { code: "TMT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "12" },
    { code: "TMY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "11" },
    { code: "TSG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "9" },
    { code: "TSP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "6" },
    { code: "TSR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "3" },
    { code: "TSS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "0" },
    { code: "TSB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "13" },
    { code: "TST", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "12" },
    { code: "TSY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "11" },
    { code: "TSYE", nameTh: "ตะกร้าพลาสติกสีเหลือง (ฉลากเยลโล่)", toteGroup: "11" },
    { code: "TTG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "9" },
    { code: "TTP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "6" },
    { code: "TTR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "3" },
    { code: "TTS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "0" },
    { code: "TTB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "13" },
    { code: "TTT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "12" },
    { code: "TTY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "11" },
    { code: "TXG", nameTh: "ตะกร้าพลาสติกสีเขียว", toteGroup: "9" },
    { code: "TXP", nameTh: "ตะกร้าพลาสติกสีชมพู", toteGroup: "6" },
    { code: "TXR", nameTh: "ตะกร้าพลาสติกสีแดง", toteGroup: "3" },
    { code: "TXS", nameTh: "ตะกร้าพลาสติกสีเงิน", toteGroup: "0" },
    { code: "TXB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "13" },
    { code: "TXT", nameTh: "ตะกร้าพลาสติกสีน้ำตาล", toteGroup: "12" },
    { code: "TXY", nameTh: "ตะกร้าพลาสติกสีเหลือง", toteGroup: "11" },
    { code: "TX", nameTh: "ลังกระดาษคาดสี", toteGroup: "17" },
    { code: "TDO", nameTh: "คาดส้ม", toteGroup: "18" }
  ];

  constructor(private fb: FormBuilder,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const now = new Date()
    this.dispatchForm = this.fb.group({
      deliveryOrder: [''],
      mode: [null],
      orderFlow: [null],
      subfixToteCode: [''],
      startRunningNumber: [''],
      toteId: [''],
      platNo: ['Truck@Galaxy', Validators.required],
      driverName: ['Dominic Toretto', Validators.required],
      priceDate: [now.toISOString().split('T')[0], Validators.required],
    });

    this.toteForm = this.fb.group({
      items: this.fb.array([])
    });

    this.dispatchForm.get('mode')?.valueChanges.subscribe(mode => {
      const toteIdControl = this.dispatchForm.get('toteId');
      const subfixToteCodeControl = this.dispatchForm.get('subfixToteCode');
      const startRunningNumberControl = this.dispatchForm.get('startRunningNumber');

      if (mode === 'SINGLE_TOTE') {
        toteIdControl?.setValidators([Validators.required]);
        subfixToteCodeControl?.clearValidators();
        startRunningNumberControl?.clearValidators();
      } else if (mode === 'RANDOM_TOTE') {
        subfixToteCodeControl?.setValidators([Validators.required]);
        startRunningNumberControl?.setValidators([Validators.required, Validators.min(1)]);
        toteIdControl?.clearValidators();
      } else {
        toteIdControl?.clearValidators();
        subfixToteCodeControl?.clearValidators();
        startRunningNumberControl?.clearValidators();
      }

      toteIdControl?.updateValueAndValidity();
      subfixToteCodeControl?.updateValueAndValidity();
      startRunningNumberControl?.updateValueAndValidity();
    });
  }

  ngAfterViewInit(): void {
    const modalElement = document.getElementById('totePreviewModal');
    if (modalElement) {
      this.modal = new bootstrap.Modal(modalElement);
    }
  }

  openModal() {
    this.modal?.show();
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

  createItem(productName: string, articleNo: string, barcode: string, assignedQty: number, unit: string, toteId: string, unitFactor?: number): FormGroup {
    return this.fb.group({
      productName: [productName],
      articleNo: [articleNo],
      barcode: [barcode],
      assignedQty: [assignedQty],
      unit: [unit],
      unitFactor: [unitFactor],
      details: this.fb.array([this.createDetail(assignedQty, toteId)])
    });
  }

  createDetail(pickedQty?: number, toteId?: string): FormGroup {
    return this.fb.group({
      pickQty: [pickedQty, Validators.required],
      toteId: [toteId, Validators.required]
    });
  }

  get f() {
    return this.dispatchForm.controls;
  }

  onChangedMode(): void {
    this.items.clear()
    this.mapToteDetail()
  }

  onChangedInputDelivery(): void {
    const inputDeliveryOrderString = this.dispatchForm.get('deliveryOrder')?.value ?? '';

    try {
      this.deliveryOrderObject = JSON.parse(inputDeliveryOrderString);
    } catch (e) {
      if (inputDeliveryOrderString) {
        this.toastr.error('JSON parse error:');
      }
      this.deliveryOrderObject = null;
    }

    this.mapToteDetail()
  }

  mapToteDetail(): void {
    const mode = this.dispatchForm.get('mode')?.value ?? ''
    const orderFlow = this.dispatchForm.get('orderFlow')?.value ?? ''
    if (mode != 'CUSTOM_TOTE') {
      return;
    }

    if (this.deliveryOrderObject && Array.isArray(this.deliveryOrderObject.items)) {
      const items = this.deliveryOrderObject.items;
      this.items.clear();

      if (items && Array.isArray(items)) {
        items.forEach(item => {
          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.articleNo ?? '',
              item.barcode ?? '',
              orderFlow == 'KEEP_STOCK' ? item.qty : item.assignedQty ?? 0, //TODO
              orderFlow == 'KEEP_STOCK' ? item.unit : item.crossDock?.unit ?? '', //TODO
              '',
              item.unitFactor ?? 0
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

  validateForm(): boolean {
    if (this.dispatchForm.invalid || this.toteForm.invalid) {
      this.dispatchForm.markAllAsTouched();
      if (this.dispatchForm.get('mode')?.value == 'CUSTOM_TOTE') {
        this.toteForm.markAllAsTouched();
      }
      return true
    }
    return false
  }

  onSubmit() {
    if (this.validateForm()) {
      return;
    }

    const dispatchValue = this.dispatchForm.value
    const orderFlow = dispatchValue.orderFlow

    const now = new Date();
    const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(this.deliveryOrderObject.po.cutOffDeliveryDate));
    const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(this.deliveryOrderObject.po.pickDate));
    const currentDate = now.toISOString().split('T')[0]
    const expDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    const plateNo = this.dispatchForm.get('platNo')?.value ?? '';
    const driverName = this.dispatchForm.get('driverName')?.value ?? '';
    const priceDate = this.dispatchForm.get('priceDate')?.value ?? '';

    if (!this.deliveryOrderObject?.items || !Array.isArray(this.deliveryOrderObject.items)) {
      this.toastr.error('Invalid deliveryOrder structure: missing items array', 'แจ้งเตือน');
      return;
    }

    if (orderFlow == 'CROSS_DOCK') {
      this.generateDispatchCrossDock(this.deliveryOrderObject.doNo, deliveryDate, pickDate, driverName, plateNo, priceDate, expDate, currentDate);
    } else {
      // this.confirmTote()
      this.generateDispatcKeepStock()

      console.log(this.confirmToteData)
      console.log(this.confirmShipmentData)
    }
  }

  mapRowCsv(doNo: string,
    barcode: string,
    pickQty: string,
    unit: string,
    toteId: string,
    deliveryDate: string,
    pickDate: string,
    driverName: string,
    plateNo: string,
    priceDate: string,
    expDate: string,
    currentDate: string): any[] {
    return [
      "01",
      `SO-${doNo}`,
      doNo,
      barcode,
      (Number(pickQty ?? 0)).toFixed(2),
      unit ?? "",
      toteId,
      deliveryDate,
      pickDate,
      "",
      "",
      driverName,
      plateNo,
      "",
      `LD${this.dateUtils.generateCompactDateTime(new Date())}`,
      priceDate === null || priceDate === '' ? 'YYYY-MM-DD' : priceDate,
      expDate,
      currentDate,
      currentDate,
      `LTEST-${doNo.split('-').slice(1).join('-')}`
    ]
  }

  buildCSVData(doNo: string,
    deliveryDate: string,
    pickDate: string,
    driverName: string,
    plateNo: string,
    priceDate: string,
    expDate: string,
    currentDate: string): any[] {

    const rows: (string | number)[][] = [];
    const customToteItems: any[] = this.items.value
    const itemCount = customToteItems.length
    const dispatchFormData = this.dispatchForm.value
    const mode = dispatchFormData.value
    const deliveryOrderItems: any[] = this.deliveryOrderObject.items

    if (mode == 'CUSTOM_TOTE' || itemCount > 0) {
      for (let i = 0; i < itemCount; i++) {
        const doItem = customToteItems[i]

        if (doItem.details) {
          for (let j = 0; j < doItem.details.length; j++) {
            const item = doItem.details[j]
            rows.push(this.mapRowCsv(doNo,
              doItem.barcode,
              item.pickQty,
              item.unit,
              item.toteId,
              deliveryDate,
              pickDate,
              driverName,
              plateNo,
              priceDate,
              expDate,
              currentDate
            ));
          }
        }
      }
    }
    else if (mode == 'RANDOM_TOTE') {
      this.generateToteIdList(deliveryOrderItems.length)

      if (deliveryOrderItems.length > 0) {
        this.items.clear();

        deliveryOrderItems.forEach((item, index) => {
          const toteId = this.toteIdList[index]
          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.articleNo ?? '',
              item.barcode ?? '',
              item.assignedQty ?? 0,
              item.crossDock.unit ?? '',
              toteId,
              item.unitFactor ?? 0
            )
          );

          rows.push(this.mapRowCsv(doNo,
            item.barcode,
            item.assignedQty,
            item.crossDock.unit,
            toteId,
            deliveryDate,
            pickDate,
            driverName,
            plateNo,
            priceDate,
            expDate,
            currentDate
          ));
        });
      }
    } else {
      const toteId: string = dispatchFormData.toteId;
      const rows: (string | number)[][] = [];

      if (deliveryOrderItems.length > 0) {
        this.items.clear();

        deliveryOrderItems.forEach((item) => {
          console.log(item)
          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.articleNo ?? '',
              item.barcode ?? '',
              item.assignedQty ?? 0,
              item.crossDock.unit ?? '',
              toteId,
              item.unitFactor ?? 0
            )
          );

          rows.push(this.mapRowCsv(doNo,
            item.barcode,
            item.assignedQty,
            item.crossDock.unit,
            toteId,
            deliveryDate,
            pickDate,
            driverName,
            plateNo,
            priceDate,
            expDate,
            currentDate
          ));
        });
      }
    }

    return rows;
  }

  generateDispatchCrossDock(doNo: string,
    deliveryDate: string,
    pickDate: string,
    driverName: string,
    plateNo: string,
    priceDate: string,
    expDate: string,
    currentDate: string): void {
    const headers: string[] = [
      "01", "shipmentNo", "doNo", "barcode", "pickedQty", "uom", "toteId", "deliverydate",
      "pickupdate", "couriercode", "couriername", "drivername", "truckId", "plateno",
      "loadingNo", "priceDate", "expDate", "mfgDate", "recDate", "lotNo"
    ];

    const rows: (string | number)[][] = [];
    rows.push(...this.buildCSVData(doNo, deliveryDate, pickDate, driverName, plateNo, priceDate, expDate, currentDate));

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
    link.download = `shipment_${this.deliveryOrderObject.doNo}.csv`;
    link.click();
  }

  onPreview(): void {
    if (this.validateForm()) {
      return;
    }

    if (this.deliveryOrderObject && Array.isArray(this.deliveryOrderObject.items)) {
      const deliveryOrderItems = this.deliveryOrderObject.items;
      this.items.clear();

      const dispatchFormData = this.dispatchForm.value
      const subfixToteCode: string = dispatchFormData.subfixToteCode;
      const runningRandomStart: number = dispatchFormData.startRunningNumber;
      const mode: string = dispatchFormData.mode
      const orderFlow: string = dispatchFormData.orderFlow
      const toteId: string = dispatchFormData.toteId
      this.toteIdList = []

      if (mode == 'RANDOM_TOTE') {
        for (let i = 0; i < deliveryOrderItems.length; i++) {
          const randomIndex = Math.floor(Math.random() * this.prefixToteList.length);
          let toteId = `${this.prefixToteList[randomIndex].code}${subfixToteCode}${String(runningRandomStart + i).padStart(4, '0')}`;
          this.toteIdList.push(toteId);
        }
      }

      if (deliveryOrderItems && Array.isArray(deliveryOrderItems)) {
        deliveryOrderItems.forEach((item, index) => {
          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.articleNo ?? '',
              item.barcode ?? '',
              orderFlow == 'CROSS_DOCK' ? item.assignedQty : item.qty,
              orderFlow == 'CROSS_DOCK' ? item.crossDock.unit : item.unit,
              mode == 'RANDOM_TOTE' ? this.toteIdList[index] : toteId,
              item.unitFactor ?? 0
            )
          );
        });
      }
    } else {
      console.warn('Invalid delivery order or items missing');
    }
  }

  generateDispatcKeepStock(): void {
    const confirmShipmentDetails = [];
    const confirmToteDetails = [];
    const deliveryOrderItems = this.deliveryOrderObject.items
    const dispatchFormData = this.dispatchForm.value
    const platNo = dispatchFormData.platNo
    const driverName = dispatchFormData.driverName
    const now = new Date();
    const mode = dispatchFormData.mode

    const customToteItems: any[] = this.items.value
    const itemCount = customToteItems.length

    if (mode == 'CUSTOM_TOTE' || itemCount > 0) {
      for (let i = 0; i < itemCount; i++) {
        const doItem = customToteItems[i]

        if (doItem.details) {
          for (let j = 0; j < doItem.details.length; j++) {
            const customItem = doItem.details[j]

            confirmToteDetails.push(
              this.createConfirmToteDetail(
                this.deliveryOrderObject.doNo,
                doItem.articleNo,
                customItem.toteId,
                customItem.pickQty,
                doItem.unitFactor
              )
            );

            confirmShipmentDetails.push(
              this.createConfirmShipmentDetail(
                this.deliveryOrderObject.doNo,
                i + 1,
                doItem.articleNo,
                customItem.pickQty,
                doItem.unitFactor,
                this.dateUtils.generateDate(now)
              )
            );
          }
        }
      }
    }
    else if (mode == 'RANDOM_TOTE') {
      this.generateToteIdList(deliveryOrderItems.length)
      if (deliveryOrderItems.length > 0) {
        this.items.clear();

        deliveryOrderItems.forEach((item: any, index: number) => {
          const toteId = this.toteIdList[index]

          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.articleNo ?? '',
              item.barcode ?? '',
              item.qty ?? 0,
              item.unit ?? '',
              toteId,
              item.unitFactor ?? 0
            )
          );

          confirmToteDetails.push(
            this.createConfirmToteDetail(
              this.deliveryOrderObject.doNo,
              item.articleNo,
              toteId,
              item.qty,
              item.unitFactor
            )
          );

          confirmShipmentDetails.push(
            this.createConfirmShipmentDetail(
              this.deliveryOrderObject.doNo,
              index + 1,
              item.articleNo,
              item.qty,
              item.unitFactor,
              this.dateUtils.generateDate(now)
            )
          );
        });
      }
    }
    else {
      const toteId: string = dispatchFormData.toteId;
      const rows: (string | number)[][] = [];

      if (deliveryOrderItems.length > 0) {
        this.items.clear();

        deliveryOrderItems.forEach((item: any, index: number) => {
          this.items.push(
            this.createItem(
              item.productName ?? '',
              item.articleNo ?? '',
              item.barcode ?? '',
              item.qty ?? 0,
              item.unit ?? '',
              toteId,
              item.unitFactor ?? 0
            )
          );

          confirmToteDetails.push(
            this.createConfirmToteDetail(
              this.deliveryOrderObject.doNo,
              item.articleNo,
              toteId,
              item.qty,
              item.unitFactor
            )
          );

          confirmShipmentDetails.push(
            this.createConfirmShipmentDetail(
              this.deliveryOrderObject.doNo,
              index + 1,
              item.articleNo,
              item.qty,
              item.unitFactor,
              this.dateUtils.generateDate(now)
            )
          );
        });
      }
    }

    this.confirmShipmentData = {
      "xmldata": {
        "data": {
          "orderinfo": [
            {
              "warehouseId": "TDNE-01",
              "orderType": this.deliveryOrderObject.po.orderType,
              "customerId": "TD001",
              "docNo": this.deliveryOrderObject.doNo,
              "soReferenceA": this.deliveryOrderObject.po.poNo,
              "soReferenceB": this.deliveryOrderObject.shipment.shipmentNo,
              "deliveryNo": this.deliveryOrderObject.doNo,
              "carrierId": "210000263",
              "shippedTime": this.dateUtils.generateDateTime(now),
              "userDefine1": platNo,
              "userDefine2": driverName,
              "details": confirmShipmentDetails
            }
          ]
        }
      }
    };

    this.confirmToteData = {
      "xmldata": {
        "data": {
          "orderinfo": [
            {
              "_comment": "this file has to change 'warehouseId, orderType, docNo, soReferenceA, soReferenceB, referenceNo, sku. toteId'",
              "warehouseId": "TDNE-01",
              "orderType": this.deliveryOrderObject.po.orderType,
              "customerId": "TD001",
              "docNo": this.deliveryOrderObject.doNo,
              "soReferenceA": this.deliveryOrderObject.po.poNo,
              "soReferenceB": this.deliveryOrderObject.shipment.shipmentNo,
              "details": confirmToteDetails
            }
          ]
        }
      }
    }
  }

  createConfirmToteDetail(doNo: string, articleNo: string, toteId: string, pickQty: number, unitFactor: number) {
    return {
      referenceNo: doNo,
      sku: articleNo,
      toteId: toteId,
      qtyOrdered: pickQty * unitFactor
    };
  }

  createConfirmShipmentDetail(doNo: string, lineNo: number, articleNo: string, pickQty: number, unitFactor: number, lotAtt03: string) {
    return {
      referenceNo: doNo,
      lineNo: lineNo,
      sku: articleNo,
      qtyShipped: pickQty * unitFactor,
      lotAtt01: "",
      lotAtt02: "",
      lotAtt03: lotAtt03,
      lotAtt05: "CJ",
      lotAtt06: "CJ",
      lotAtt08: "N"
    };
  }

  generateToteIdList(itemCount: number): void {
    const dispatchFormData = this.dispatchForm.value
    const subfixToteCode: string = dispatchFormData.subfixToteCode;
    const runningRandomStart: number = dispatchFormData.startRunningNumber;

    for (let i = 0; i < itemCount; i++) {
      const randomIndex = Math.floor(Math.random() * this.prefixToteList.length);
      let toteId = `${this.prefixToteList[randomIndex].code}${subfixToteCode}${String(runningRandomStart + i).padStart(4, '0')}`;
      this.toteIdList.push(toteId);
    }
  }

  clearData(): void {
    this.items.clear()
    this.toteIdList = []
    this.dispatchForm.reset()
    this.toteForm.reset()
    this.confirmShipmentData = null
    this.confirmToteData = null
  }

  copyToClipboard(element: HTMLElement, button: HTMLButtonElement): void {
  const range = document.createRange();
  range.selectNode(element);
  const selection = window.getSelection();

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
  }

  // Update button UI
  button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
  button.disabled = true;

  setTimeout(() => {
    button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
    button.disabled = false;
  }, 2000);
}

}

