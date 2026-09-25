import { NgSelectComponent } from '@ng-select/ng-select';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { DateUtils } from '../../utils/date.utils';
import { EpochUtils } from '../../utils/epoch.utils';
declare var bootstrap: any;
import { combineLatest } from 'rxjs';
import { CopyButton } from "../../shared/copy-button/copy-button";
import { JsonEditor } from '../../shared/json-editor/json-editor';
import { JsonUtils } from '../../utils/json.utils';
import { CodeBox } from '../../shared/code-box/code-box';
@Component({
  selector: 'app-td-dispatch-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
    CopyButton,
    JsonEditor,
    CodeBox
  ],
  templateUrl: './td-dispatch-order.html',
  styleUrls: ['./td-dispatch-order.scss']
})
export class TDDispatchOrder implements OnInit, AfterViewInit {

  dispatchForm!: FormGroup;
  toteForm!: FormGroup;
  dateUtils: DateUtils = new DateUtils()
  toteIdList: string[] = [];
  modal: any;
  confirmToteData: any
  confirmShipmentData: any
  barcodList: string[] = []
  priceDateList: any[] = []
  queryExternalPriceString: string = ''

  // Display names only — ids are kept so saved forms / logic don't change
  modes = [
    { id: 'RANDOM_TOTE', name: 'Auto – Random Prefix' },
    // User enters the prefix(es); suffix = now (yyyyMMddHHmm) and running number auto from 1
    { id: 'SPECIFY_TOTE', name: 'Auto – My Prefix' },
    { id: 'CUSTOM_TOTE', name: 'Manual – พิมพ์ Tote ID เอง' },
    { id: 'SINGLE_TOTE', name: 'One Tote – ใช้ Tote เดียวทุกรายการ' },
  ];

  orderFlows = [
    { id: 'KEEP_STOCK', name: 'Keep Stock' },
    { id: 'CROSS_DOCK', name: 'Cross Dock' }
  ];

  prefixToteList: any[] = [
    { code: "TLG", nameTh: "ลังพลาสติกสีเขียว", toteGroup: "TG" },
    { code: "TB", nameTh: "ตะกร้าพลาสติกสีน้ำเงิน", toteGroup: "TB" },
    { code: "TX", nameTh: "ลังกระดาษคาดสี", toteGroup: "TX" },
    { code: "TS", nameTh: "ลังพลาสติกสีเทา", toteGroup: "TS" },
    { code: "TG", nameTh: "ลังพลาสติกสีเขียว", toteGroup: "TG" }
  ]

  constructor(private fb: FormBuilder,
    private toastr: ToastrService,
    private clipboard: Clipboard
  ) { }

  /** Tote code just copied from the "รายการ Tote" list (shows a check for a moment) */
  copiedToteCode: string | null = null

  copyToteCode(code: string): void {
    this.clipboard.copy(code)
    this.copiedToteCode = code
    setTimeout(() => {
      if (this.copiedToteCode === code) this.copiedToteCode = null
    }, 1500)
  }

  ngOnInit(): void {
    // Numeric groups in order; non-numeric groups (e.g. PL) go last instead of breaking the sort
    const groupOrder = (tote: any) => isNaN(+tote.toteGroup) ? Number.MAX_SAFE_INTEGER : +tote.toteGroup
    this.prefixToteList = this.prefixToteList.slice().sort((a, b) => groupOrder(a) - groupOrder(b))

    const now = new Date()
    this.dispatchForm = this.fb.group({
      deliveryOrders: this.fb.array([
        this.fb.group({
          value: ['', Validators.required]
        })
      ]),
      mode: [null, Validators.required],
      orderFlow: [null, Validators.required],
      subfixToteCode: [''],
      startRunningNumber: [''],
      /** Unticked: suffix = now (yyyyMMddHHmm, Bangkok) and running number starts at 1 */
      customToteCode: [false],
      specifyToteCode: [''],
      toteId: [''],
      platNo: ['Truck@Galaxy', Validators.required],
      driverName: ['Dominic Toretto', Validators.required],
      externalPrice: [null],
      priceDateSource: ['MANUAL']
    })

    this.toteForm = this.fb.group({
      items: this.fb.array([])
    })

    this.dispatchForm.get('mode')?.valueChanges.subscribe(mode => {
      const toteIdControl = this.dispatchForm.get('toteId');
      const subfixToteCodeControl = this.dispatchForm.get('subfixToteCode');
      const startRunningNumberControl = this.dispatchForm.get('startRunningNumber');
      const specifyToteCodeControl = this.dispatchForm.get('specifyToteCode');

      if (mode === 'SINGLE_TOTE') {
        toteIdControl?.setValidators([Validators.required]);
        subfixToteCodeControl?.clearValidators();
        startRunningNumberControl?.clearValidators();
      } else if (mode === 'RANDOM_TOTE') {
        subfixToteCodeControl?.setValidators([Validators.required]);
        startRunningNumberControl?.setValidators([Validators.required, Validators.min(1)]);
        toteIdControl?.clearValidators();
      } else if (mode === 'SPECIFY_TOTE') {
        // Auto – My Prefix: no custom suffix / running number, always now (yyyyMMddHHmm) + 1
        this.dispatchForm.get('customToteCode')?.setValue(false, { emitEvent: false });
        this.applyDefaultToteCode();
        specifyToteCodeControl?.setValidators([Validators.required]);
        subfixToteCodeControl?.setValidators([Validators.required]);
        startRunningNumberControl?.setValidators([Validators.required, Validators.min(1)]);
        toteIdControl?.clearValidators();
      } else {
        specifyToteCodeControl?.clearValidators();
        toteIdControl?.clearValidators();
        subfixToteCodeControl?.clearValidators();
        startRunningNumberControl?.clearValidators();
      }

      specifyToteCodeControl?.updateValueAndValidity();
      toteIdControl?.updateValueAndValidity();
      subfixToteCodeControl?.updateValueAndValidity();
      startRunningNumberControl?.updateValueAndValidity();
    })

    // Hidden fields always carry the defaults; ticking the box only reveals them for editing
    this.dispatchForm.get('customToteCode')?.valueChanges.subscribe(custom => {
      if (!custom) this.applyDefaultToteCode()
    })
    this.applyDefaultToteCode()

    this.dispatchForm.get('orderFlow')?.valueChanges.subscribe(orderFlow => {
      this.setAndClearValidateExternalPrice()
      this.onPreviewToteDetail()
    })

    combineLatest([
      this.dispatchForm.get('subfixToteCode')!.valueChanges,
      this.dispatchForm.get('startRunningNumber')!.valueChanges,
    ]).subscribe(([subfixToteCode, startRunningNumber]) => {
      if (subfixToteCode && startRunningNumber) {
        this.onPreviewToteDetail();
      }
    });

    this.dispatchForm.get('toteId')?.valueChanges.subscribe(value => {
      this.onPreviewToteDetail()
    })

    this.dispatchForm.get('externalPrice')?.valueChanges.subscribe(value => {
      this.onPreviewToteDetail()
    })

    this.dispatchForm.get('priceDateSource')?.valueChanges.subscribe(value => {
      this.setAndClearValidateExternalPrice()
      this.generateExternalPriceQuery()
      this.onPreviewToteDetail()
    })
  }

  ngAfterViewInit(): void {
    const modalElement = document.getElementById('totePreviewTDModal');
    if (modalElement) {
      this.modal = new bootstrap.Modal(modalElement);
    }
  }

  get deliveryOrders(): FormArray {
    return this.dispatchForm.get('deliveryOrders') as FormArray;
  }

  get items(): FormArray {
    return this.toteForm.get('items') as FormArray;
  }

  openModal() {
    this.modal?.show();
  }

  addDeliveryOrder() {
    this.deliveryOrders.push(this.fb.group({
      value: ['', Validators.required]
    }));
  }

  setAndClearValidateExternalPrice() {
    const externalPriceControl = this.dispatchForm.get('externalPrice')
    const orderFlow = this.dispatchForm.get('orderFlow')?.value
    const priceDateSource = this.dispatchForm.get('priceDateSource')?.value
    if (orderFlow === 'CROSS_DOCK' && priceDateSource === 'QUERY') {
      externalPriceControl?.setValidators([Validators.required])
    } else {
      externalPriceControl?.clearValidators()
      externalPriceControl?.updateValueAndValidity()
    }
  }

  removeDeliveryOrder(index: number) {
    this.deliveryOrders.removeAt(index);
    this.onPreviewToteDetail()
  }

  /**
   * Each box accepts one delivery order `{...}`, several comma-separated `{...},{...}`, or an array `[{...},{...}]`.
   * Boxes with invalid JSON are skipped (the JSON editor shows the error).
   */
  getInputDeliveryOrderList(): any[] {
    return (this.dispatchForm.get('deliveryOrders') as FormArray)
      .controls
      .flatMap(control => {
        try {
          return JsonUtils.parseObjectList(control.get('value')?.value ?? '');
        } catch {
          return [];
        }
      })
  }

  onChangedInputDelivery(index: number) {
    this.generateExternalPriceQuery()
    this.onPreviewToteDetail()
  }

  onChangedOrderFlow(): void {
    this.deliveryOrders.clear()
    this.deliveryOrders.push(
      this.fb.group({
        value: ['', Validators.required]
      })
    )
  }

  generateExternalPriceQuery() {
    this.queryExternalPriceString = ''
    const orderFlow = this.dispatchForm.get('orderFlow')?.value
    const priceDateSource = this.dispatchForm.get('priceDateSource')?.value

    if (orderFlow == 'CROSS_DOCK' && priceDateSource == 'QUERY' && this.dispatchForm.get('deliveryOrders')?.value.length > 0) {
      let barcodes: any[] = []
      const deliveryOrders = this.getInputDeliveryOrderList()
      deliveryOrders.forEach((deliveryOrder: any) => {
        if ((deliveryOrder.items?.length ?? 0) > 0) {
          deliveryOrder.items.forEach((item: any) => {
            barcodes.push(item.barcode)
          })
        }
      })

      const formattedBarcodes = barcodes.map((b: any) => `"${b}"`).join(', ');
      this.queryExternalPriceString = `db.external_prices.aggregate([{"$match":{"barcode":{"$in":[${formattedBarcodes}]}}},{"$sort":{"createdDate":-1}},{"$group":{"_id":"$barcode","latest":{"$first":"$$ROOT"}}},{"$replaceRoot":{"newRoot":"$latest"}},{"$project":{"_id":0,"articleNo":1,"barcode":1,"createdDate":1}}])`;
    }
  }

  createItem(productName: string, articleNo: string, barcode: string, assignedQty: number, unit: string, toteId: string, unitFactor?: number,
    doNo?: string, deliveryDate?: string, pickDate?: string, poNo?: string, shipmentNo?: string, orderType?: string, priceDate?: string): FormGroup {
    const now = new Date()
    return this.fb.group({
      productName: [productName],
      articleNo: [articleNo],
      barcode: [barcode],
      assignedQty: [assignedQty],
      unit: [unit],
      unitFactor: [unitFactor],
      doNo: [doNo],
      deliveryDate: [deliveryDate],
      pickDate: [pickDate],
      poNo: [poNo],
      shipmentNo: [shipmentNo],
      orderType: [orderType],
      priceDate: [priceDate, Validators.required],
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
    this.onPreviewToteDetail()
  }

  onPreviewToteDetail(): void {
    const mode = this.dispatchForm.get('mode')?.value ?? ''
    const orderFlow = this.dispatchForm.get('orderFlow')?.value ?? ''
    const priceDateSource = this.dispatchForm.get('priceDateSource')?.value ?? ''

    const inputDeliveryOrders = this.getInputDeliveryOrderList()
    const deliveryItemSize = this.getTotalSizeFromDeliveryOrders()
    this.items.clear()

    const specifyToteCode: number = this.dispatchForm.get('specifyToteCode')?.value;
    const subfixToteCode: number = this.dispatchForm.get('subfixToteCode')?.value;
    const startRunningNumber: number = this.dispatchForm.get('startRunningNumber')?.value;
    const toteId: number = this.dispatchForm.get('toteId')?.value;

    if (deliveryItemSize == 0
      || mode == 'SPECIFY_TOTE' && (!subfixToteCode || !startRunningNumber || !specifyToteCode)
      || mode == 'RANDOM_TOTE' && (!subfixToteCode || !startRunningNumber)
      || mode == 'SIGNLE_TOTE' && !toteId
    ) {
      return;
    }

    // One list for all DOs and a running index across them, so the running number keeps counting
    // (01, 02, …) instead of restarting per DO and producing the same tote id in different DOs
    if (mode == 'RANDOM_TOTE') {
      this.generateToteIdList(deliveryItemSize)
    }
    else if (mode == 'SPECIFY_TOTE') {
      this.generateSpecifyToteIdList(deliveryItemSize)
    }
    let toteIndex = 0

    inputDeliveryOrders.forEach((deliveryOrder: any) => {
      if (deliveryOrder && Array.isArray(deliveryOrder.items)) {
        if ((orderFlow == 'KEEP_STOCK' && deliveryOrder.orderFlow != 'KEEP_STOCK') || (orderFlow == 'CROSS_DOCK' && deliveryOrder.orderFlow != 'CROSS_DOCK')) {
          this.toastr.error('Invalid delivery order structure: mismatched order flow type', 'แจ้งเตือน');
          return;
        }

        const items = deliveryOrder.items;
        const doNo = deliveryOrder.doNo
        const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.cutOffDeliveryDate))
        const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.pickDate))
        const isKeepStock = orderFlow == 'KEEP_STOCK'


        if (items && Array.isArray(items)) {
          const barcodeCreatedDateMap = isKeepStock || priceDateSource == 'MANUAL' ? {} : this.getBarcodeCreatedDateMap()
          const priceDate = new Date().toISOString().slice(0, 10)
          items.forEach((item: any) => {
            const toteId = mode == 'RANDOM_TOTE' || mode == 'SPECIFY_TOTE' ? this.toteIdList[toteIndex++] : (mode == 'SINGLE_TOTE' ? this.dispatchForm.get('toteId')?.value : '')
            this.items.push(
              this.createItem(
                item.productName ?? '',
                item.articleNo ?? '',
                item.barcode ?? '',
                isKeepStock ? item.qty : item.assignedQty, //TODO
                isKeepStock ? item.unit : (item.crossDock?.unit ?? item.unit ?? ''), // Cross Dock: prefer crossDock.unit, fall back to items[].unit
                toteId,
                item.unitFactor ?? 0,
                doNo,
                deliveryDate,
                pickDate,
                isKeepStock ? deliveryOrder.po.poNo : '',
                isKeepStock ? deliveryOrder.shipment.shipmentNo : '',
                isKeepStock ? deliveryOrder.po.orderType : '',
                isKeepStock || priceDateSource == 'MANUAL' ? priceDate : barcodeCreatedDateMap.get(item.barcode) ?? ''
              )
            );
          });
        }
      } else {
        console.warn('Invalid delivery order or items missing');
      }
    })
  }

  getBarcodeCreatedDateMap(): any {
    const priceDateSource = this.dispatchForm.get('priceDateSource')?.value
    let externalPrices = JSON.parse(this.dispatchForm.get('externalPrice')?.value)

    if (priceDateSource == 'MANUAL') {
      return {}
    }

    if (externalPrices && !Array.isArray(externalPrices)) {
      externalPrices = [externalPrices];
    }

    if (!externalPrices) {
      console.warn('externalPrices is null or undefined');
      return new Map();
    }

    return new Map<string, string>(
      (externalPrices ?? []).map((item: any) => {
        const formattedDate = new Date(item.createdDate).toISOString().slice(0, 10);
        return [item.barcode, formattedDate];
      })
    );
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
      this.toastr.error('Invalid form', 'แจ้งเตือน');
      return true
    }
    return false
  }

  /**
   * Tote ids used by more than one DO -> the DO numbers using them.
   * The same tote may hold several items of one DO; a tote shared by different DOs is highlighted
   * as a warning (it does not block Export CSV).
   */
  get duplicateToteIds(): Map<string, string[]> {
    const doNosByTote = new Map<string, Set<string>>()
    this.items.controls.forEach(item => {
      const doNo = String(item.get('doNo')?.value ?? '')
      ;(item.get('details') as FormArray).controls.forEach(detail => {
        const toteId = String(detail.get('toteId')?.value ?? '').trim().toUpperCase()
        if (!toteId || this.isSharedToteId(toteId)) return
        if (!doNosByTote.has(toteId)) doNosByTote.set(toteId, new Set())
        doNosByTote.get(toteId)!.add(doNo)
      })
    })
    return new Map([...doNosByTote]
      .filter(([, doNos]) => doNos.size > 1)
      .map(([toteId, doNos]) => [toteId, [...doNos]]))
  }

  /** Other DOs using `toteId`, for the message under a duplicated tote input */
  duplicateToteOtherDos(toteId: string | null | undefined, doNo: string | null | undefined): string[] {
    const key = String(toteId ?? '').trim().toUpperCase()
    return (this.duplicateToteIds.get(key) ?? []).filter(other => other !== doNo)
  }

  /** 'PL' (pallet, no running number — see generateSpecifyToteIdList) may be shared by several DOs */
  private isSharedToteId(toteId: string): boolean {
    return toteId === 'PL'
  }

  onSubmit() {
    if (this.validateForm()) {
      return;
    }

    const dispatchValue = this.dispatchForm.value
    const orderFlow = dispatchValue.orderFlow

    const platNo = dispatchValue.platNo
    const driverName = dispatchValue.driverName

    if (this.getTotalSizeFromDeliveryOrders() == 0) {
      this.toastr.error('Invalid deliveryOrder structure: missing items array', 'แจ้งเตือน');
      return;
    }

    if (orderFlow == 'CROSS_DOCK') {
      this.generateDispatchCrossDock(driverName, platNo)
    } else {
      this.generateDispatcKeepStock()
    }
  }

  mapRowCsv(shipmentNo: string,
    doNo: string,
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
      shipmentNo,
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

  getTotalSizeFromDeliveryOrders(): number {
    let size = 0;
    const deliveryOrders = this.getInputDeliveryOrderList()
    for (let i = 0; i < deliveryOrders.length; i++) {
      size += deliveryOrders[i].items?.length ?? 0
    }
    return size
  }

  buildCSVData(
    driverName: string,
    plateNo: string): any[] {

    const rows: (string | number)[][] = [];
    const customToteItems: any[] = this.items.value
    const itemCount = customToteItems.length
    const dispatchFormData = this.dispatchForm.value
    const mode = dispatchFormData.mode

    const inputDeliveryOrders = this.getInputDeliveryOrderList()
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const expDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    const storeCode = inputDeliveryOrders[0]?.po?.storeCode
    const doNo = inputDeliveryOrders[0]?.doNo
    const shipmentNo = `SO-${doNo}`

    if (itemCount > 0) {
      for (let i = 0; i < itemCount; i++) {
        const doItem = customToteItems[i]

        if (doItem.details) {
          for (let j = 0; j < doItem.details.length; j++) {
            const item = doItem.details[j]
            rows.push(this.mapRowCsv(
              shipmentNo,
              doItem.doNo,
              doItem.barcode,
              item.pickQty,
              doItem.unit,
              item.toteId,
              doItem.deliveryDate,
              doItem.pickDate,
              driverName,
              plateNo,
              doItem.priceDate,
              expDate,
              currentDate
            ));
          }
        }
      }
    }
    // else {
    //   const itemSize = this.getTotalSizeFromDeliveryOrders()
    //   if (itemSize > 0) {
    //     this.items.clear()
    //   }

    //   let index = 0

    //   inputDeliveryOrders.forEach((deliveryOrder: any) => {
    //     const doNo = deliveryOrder.doNo
    //     const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.cutOffDeliveryDate))
    //     const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.pickDate))

    //     if (mode == 'RANDOM_TOTE') {
    //       this.generateToteIdList(itemSize)

    //       deliveryOrder.items.forEach((item: any) => {
    //         const toteId = this.toteIdList[index]
    //         this.items.push(
    //           this.createItem(
    //             item.productName ?? '',
    //             item.articleNo ?? '',
    //             item.barcode ?? '',
    //             item.assignedQty ?? 0,
    //             item.crossDock.unit ?? '',
    //             toteId,
    //             item.unitFactor ?? 0,
    //             doNo,
    //             deliveryDate,
    //             pickDate
    //           )
    //         )

    //         rows.push(this.mapRowCsv(doNo,
    //           item.barcode,
    //           item.assignedQty,
    //           item.crossDock.unit,
    //           toteId,
    //           deliveryDate,
    //           pickDate,
    //           driverName,
    //           plateNo,
    //           priceDate,
    //           expDate,
    //           currentDate
    //         ))

    //         index++
    //       });
    //     }
    //     else {
    //       const toteId: string = dispatchFormData.toteId;

    //       deliveryOrder.items.forEach((item: any) => {
    //         this.items.push(
    //           this.createItem(
    //             item.productName ?? '',
    //             item.articleNo ?? '',
    //             item.barcode ?? '',
    //             item.assignedQty ?? 0,
    //             item.crossDock.unit ?? '',
    //             toteId,
    //             item.unitFactor ?? 0,
    //             doNo,
    //             deliveryDate,
    //             pickDate
    //           )
    //         );

    //         rows.push(this.mapRowCsv(doNo,
    //           item.barcode,
    //           item.assignedQty,
    //           item.crossDock.unit,
    //           toteId,
    //           deliveryDate,
    //           pickDate,
    //           driverName,
    //           plateNo,
    //           priceDate,
    //           expDate,
    //           currentDate
    //         ))
    //       })
    //     }
    //   })
    // }

    return rows;
  }

  generateDispatchCrossDock(
    driverName: string,
    plateNo: string): void {
    const headers: string[] = [
      "01", "shipmentNo", "doNo", "barcode", "pickedQty", "uom", "toteId", "deliverydate",
      "pickupdate", "couriercode", "couriername", "drivername", "truckId", "plateno",
      "loadingNo", "priceDate", "expDate", "mfgDate", "recDate", "lotNo"
    ];

    const rows: (string | number)[][] = [];
    rows.push(...this.buildCSVData(driverName, plateNo));

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

    const deliveryOrder = this.getInputDeliveryOrderList()[0]
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shipment_${deliveryOrder.po.storeCode}_${this.dateUtils.generateCompactDateTime(new Date())}.csv`;
    link.click();
  }

  // onPreview(): void {
  //   if (this.validateForm()) {
  //     return;
  //   }
  //   const itemCount = this.getTotalSizeFromDeliveryOrders()

  //   if (itemCount > 0) {
  //     this.items.clear();

  //     const deliveryOrders = this.getInputDeliveryOrderList()
  //     const dispatchFormData = this.dispatchForm.value
  //     const subfixToteCode: string = dispatchFormData.subfixToteCode;
  //     const runningRandomStart: number = dispatchFormData.startRunningNumber;
  //     const mode: string = dispatchFormData.mode
  //     const orderFlow: string = dispatchFormData.orderFlow
  //     const toteId: string = dispatchFormData.toteId
  //     this.toteIdList = []

  //     if (mode == 'RANDOM_TOTE') {
  //       for (let i = 0; i < itemCount; i++) {
  //         const randomIndex = Math.floor(Math.random() * this.prefixToteList.length);
  //         let toteId = `${this.prefixToteList[randomIndex].code}${subfixToteCode}${String(runningRandomStart + i).padStart(4, '0')}`;
  //         this.toteIdList.push(toteId);
  //       }
  //     }

  //     deliveryOrders.forEach((deliveryOrder: any) => {
  //       const doNo = deliveryOrder.doNo
  //       const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.cutOffDeliveryDate))
  //       const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.pickDate))

  //       deliveryOrder.items.forEach((item: any, index: number) => {
  //         this.items.push(
  //           this.createItem(
  //             item.productName ?? '',
  //             item.articleNo ?? '',
  //             item.barcode ?? '',
  //             orderFlow == 'CROSS_DOCK' ? item.assignedQty : item.qty,
  //             orderFlow == 'CROSS_DOCK' ? item.crossDock.unit : item.unit,
  //             mode == 'RANDOM_TOTE' ? this.toteIdList[index] : toteId,
  //             item.unitFactor ?? 0,
  //             doNo,
  //             deliveryDate,
  //             pickDate
  //           )
  //         );
  //       });
  //     })
  //   } else {
  //     console.warn('Invalid delivery order or items missing');
  //   }
  // }

  generateDispatcKeepStock(): void {
    const confirmShipmentDetails: any[] = []
    const confirmToteDetails: any[] = []
    const confirmShipments: any[] = []
    const confirmTotes: any[] = []
    const deliveryOrders = this.getInputDeliveryOrderList()
    const dispatchFormData = this.dispatchForm.value
    const platNo = dispatchFormData.platNo
    const driverName = dispatchFormData.driverName
    const now = new Date();
    const mode = dispatchFormData.mode
    const shipmentTime = this.dateUtils.generateDateTime(now)

    const customToteItems: any[] = this.items.value
    const itemCount = this.getTotalSizeFromDeliveryOrders()

    if (mode == 'CUSTOM_TOTE' || customToteItems.length > 0) {
      customToteItems.forEach((doItem: any, index: number) => {
        if (doItem.details) {
          for (let j = 0; j < doItem.details.length; j++) {
            const customItem = doItem.details[j]

            confirmToteDetails.push(
              this.createConfirmToteDetail(
                doItem.doNo,
                doItem.articleNo,
                customItem.toteId,
                customItem.pickQty,
                doItem.unitFactor
              )
            );

            confirmShipmentDetails.push(
              this.createConfirmShipmentDetail(
                doItem.doNo,
                index + 1,
                doItem.articleNo,
                customItem.pickQty,
                doItem.unitFactor,
                this.dateUtils.generateDate(now)
              )
            );
          }

          const isDuplicatConfirmShipment = confirmShipments.some(cs => cs.docNo === doItem.doNo)
          const isDuplicatConfirmTote = confirmShipments.some(cs => cs.docNo === doItem.doNo)

          if (!isDuplicatConfirmShipment) {
            confirmShipments.push(this.buildConfirmShipmentData(doItem.orderType, doItem.doNo, doItem.poNo, doItem.shipmentNo, shipmentTime, platNo, driverName, confirmShipmentDetails))
          }

          if (!isDuplicatConfirmTote) {
            confirmTotes.push(this.buildConfirmToteData(doItem.orderType, doItem.doNo, doItem.poNo, doItem.shipmentNo, confirmToteDetails))
          }
        }
      })
    } else {
      if (mode == 'RANDOM_TOTE' || mode == 'SPECIFY_TOTE') {
        if (mode == 'RANDOM_TOTE') {
          this.generateToteIdList(itemCount)
        } else if (mode == 'SPECIFY_TOTE') {
          this.generateSpecifyToteIdList(itemCount)
        }
        if (itemCount > 0) {
          this.items.clear()

          deliveryOrders.forEach((deliveryOrder: any) => {
            const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.cutOffDeliveryDate))
            const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.pickDate))

            deliveryOrder.items.forEach((item: any, index: number) => {
              const toteId = this.toteIdList[index]

              this.items.push(
                this.createItem(
                  item.productName ?? '',
                  item.articleNo ?? '',
                  item.barcode ?? '',
                  item.qty ?? 0,
                  item.unit ?? '',
                  toteId,
                  item.unitFactor ?? 0,
                  deliveryOrder.doNo,
                  deliveryDate,
                  pickDate,
                  deliveryOrder.po.poNo,
                  deliveryOrder.shipment.shipmentNo,
                  deliveryOrder.po.orderType
                )
              )

              confirmToteDetails.push(
                this.createConfirmToteDetail(
                  deliveryOrder.doNo,
                  item.articleNo,
                  toteId,
                  item.qty,
                  item.unitFactor
                )
              )

              confirmShipmentDetails.push(
                this.createConfirmShipmentDetail(
                  deliveryOrder.doNo,
                  index + 1,
                  item.articleNo,
                  item.qty,
                  item.unitFactor,
                  this.dateUtils.generateDate(now)
                )
              )
            })
            confirmShipments.push(this.buildConfirmShipmentData(deliveryOrder.po.orderType, deliveryOrder.doNo, deliveryOrder.po.poNo, deliveryOrder.shipment.shipmentNo, shipmentTime, platNo, driverName, confirmShipmentDetails))
            confirmTotes.push(this.buildConfirmToteData(deliveryOrder.po.orderType, deliveryOrder.doNo, deliveryOrder.po.poNo, deliveryOrder.shipment.shipmentNo, confirmToteDetails))
          })
        }
      }
      else {
        const toteId: string = dispatchFormData.toteId;

        if (itemCount > 0) {
          this.items.clear()

          deliveryOrders.forEach((deliveryOrder: any) => {
            const deliveryDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.cutOffDeliveryDate))
            const pickDate = this.dateUtils.generateDateTimeTDSC(new Date(deliveryOrder.po.pickDate))

            deliveryOrder.items.forEach((item: any, index: number) => {
              this.items.push(
                this.createItem(
                  item.productName ?? '',
                  item.articleNo ?? '',
                  item.barcode ?? '',
                  item.qty ?? 0,
                  item.unit ?? '',
                  toteId,
                  item.unitFactor ?? 0,
                  deliveryOrder.doNo,
                  deliveryDate,
                  pickDate,
                  deliveryOrder.po.poNo,
                  deliveryOrder.shipment.shipmentNo,
                  deliveryOrder.po.orderType
                )
              )

              confirmToteDetails.push(
                this.createConfirmToteDetail(
                  deliveryOrder.doNo,
                  item.articleNo,
                  toteId,
                  item.qty,
                  item.unitFactor
                )
              );

              confirmShipmentDetails.push(
                this.createConfirmShipmentDetail(
                  deliveryOrder.doNo,
                  index + 1,
                  item.articleNo,
                  item.qty,
                  item.unitFactor,
                  this.dateUtils.generateDate(now)
                )
              )
            })

            confirmShipments.push(this.buildConfirmShipmentData(deliveryOrder.po.orderType, deliveryOrder.doNo, deliveryOrder.po.poNo, deliveryOrder.shipment.shipmentNo, shipmentTime, platNo, driverName, confirmShipmentDetails))
            confirmTotes.push(this.buildConfirmToteData(deliveryOrder.po.orderType, deliveryOrder.doNo, deliveryOrder.po.poNo, deliveryOrder.shipment.shipmentNo, confirmToteDetails))
          })
        }
      }
    }

    this.confirmShipmentData = {
      "xmldata": {
        "data": {
          "orderinfo": confirmShipments
        }
      }
    };

    this.confirmToteData = {
      "xmldata": {
        "data": {
          "orderinfo": confirmTotes
        }
      }
    }
  }

  buildConfirmShipmentData(orderType: string, doNo: string, poNo: string, shipmentNo: string, shipmentTime: string, platNo: string, driverName: string, details: any[]) {
    return {
      "warehouseId": "TDNE-01",
      "orderType": orderType,
      "customerId": "TD001",
      "docNo": doNo,
      "soReferenceA": poNo,
      "soReferenceB": shipmentNo,
      "deliveryNo": doNo,
      "carrierId": "210000263",
      "shippedTime": shipmentTime,
      "userDefine1": platNo,
      "userDefine2": driverName,
      "details": details
    }
  }

  buildConfirmToteData(orderType: string, doNo: string, poNo: string, shipmentNo: string, details: any[]) {
    return {
      "_comment": "this file has to change 'warehouseId, orderType, docNo, soReferenceA, soReferenceB, referenceNo, sku. toteId'",
      "warehouseId": "TDNE-01",
      "orderType": orderType,
      "customerId": "TD001",
      "docNo": doNo,
      "soReferenceA": poNo,
      "soReferenceB": shipmentNo,
      "details": details
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

  /**
   * Digits for the running number: 2 (01, 02 …) and one more only when the batch needs it
   * (e.g. 001 … 120). The whole batch uses the same width so ids stay aligned.
   */
  runningNumberWidth(start: number, itemCount: number): number {
    const last = Number(start) + Math.max(itemCount, 1) - 1
    return Math.max(2, String(last).length)
  }

  generateToteIdList(itemCount: number): void {
    const subfixToteCode: string = this.dispatchForm.get('subfixToteCode')?.value
    const runningRandomStart: number = this.dispatchForm.get('startRunningNumber')?.value
    this.toteIdList = []
    const width = this.runningNumberWidth(runningRandomStart, itemCount)

    for (let i = 0; i < itemCount; i++) {
      const randomIndex = Math.floor(Math.random() * this.prefixToteList.length);
      let toteId = `${this.prefixToteList[randomIndex].code}${subfixToteCode}${String(runningRandomStart + i).padStart(width, '0')}`;
      this.toteIdList.push(toteId);
    }
  }

  generateSpecifyToteIdList(itemCount: number): void {
    const specifyToteCodeRaw: string = this.dispatchForm.get('specifyToteCode')?.value
    const subfixToteCode: string = this.dispatchForm.get('subfixToteCode')?.value
    const runningRandomStart: number = this.dispatchForm.get('startRunningNumber')?.value
    this.toteIdList = []

    const prefixTotes = specifyToteCodeRaw.split(',').map((prefix) => prefix.trim())
    const prefixToteSize = prefixTotes.length
    const width = this.runningNumberWidth(runningRandomStart, itemCount)

    for (let i = 0; i < itemCount; i++) {
      const toteIndex = i < prefixToteSize ? i : Math.floor(Math.random() * prefixToteSize);
      const prefixTote = prefixTotes[toteIndex]
      let toteId = prefixTote == 'PL' ? prefixTote : `${prefixTote}${subfixToteCode}${String(runningRandomStart + i).padStart(width, '0')}`;
      this.toteIdList.push(toteId);
    }
  }

  /**
   * Default suffix = current date + time (yyyyMMddHHmm, Bangkok) and running number 1,
   * e.g. TB20260924143001. Taken when the defaults are applied (load, Clear, untick, mode switch).
   */
  get defaultSubfixToteCode(): string {
    const p = EpochUtils.partsIn(new Date(), 'bangkok')
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${p.year}${pad(p.month + 1)}${pad(p.day)}${pad(p.hour)}${pad(p.minute)}`
  }

  applyDefaultToteCode(): void {
    this.dispatchForm.patchValue({ subfixToteCode: this.defaultSubfixToteCode, startRunningNumber: 1 })
  }

  clearData(): void {
    this.items.clear()
    this.toteIdList = []
    this.dispatchForm.reset()
    this.applyDefaultToteCode()
    this.toteForm.reset()
    this.deliveryOrders.clear()
    this.deliveryOrders.push(
      this.fb.group({
        value: ['', Validators.required]
      })
    )
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

