import { NgSelectComponent } from '@ng-select/ng-select';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { DateUtils } from '../../utils/date.utils';
declare var bootstrap: any;
import { combineLatest } from 'rxjs';
import { CopyButton } from "../../shared/copy-button/copy-button";
import { CodeBox } from '../../shared/code-box/code-box';
@Component({
  selector: 'app-dispatch-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
    CopyButton,
    CodeBox
  ],
  templateUrl: './dispatch-order.html',
  styleUrls: ['./dispatch-order.scss']
})
export class DispatchOrder implements OnInit, AfterViewInit {

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

  modes = [
    { id: 'CUSTOM_TOTE', name: 'Custom Tote' },
    { id: 'RANDOM_TOTE', name: 'Random Tote' },
    { id: 'SINGLE_TOTE', name: 'Single Tote' }
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
    this.prefixToteList = this.prefixToteList.slice().sort((a, b) => +a.toteGroup - +b.toteGroup)

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
    })

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
    const modalElement = document.getElementById('totePreviewModal');
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

  getInputDeliveryOrderList(): any[] {
    return (this.dispatchForm.get('deliveryOrders') as FormArray)
      .controls
      .map(control => {
        const jsonString = control.get('value')?.value ?? '';
        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.error('Invalid JSON:', jsonString);
          return null;
        }
      })
      .filter(item => item !== null)
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
        if (deliveryOrder.items.length > 0) {
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

    const subfixToteCode: number = this.dispatchForm.get('subfixToteCode')?.value;
    const startRunningNumber: number = this.dispatchForm.get('startRunningNumber')?.value;
    const toteId: number = this.dispatchForm.get('toteId')?.value;

    if (deliveryItemSize == 0
      || mode == 'RANDOM_TOTE' && (!subfixToteCode || !startRunningNumber)
      || mode == 'SIGNLE_TOTE' && !toteId
    ) {
      return;
    }

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

        if (mode == 'RANDOM_TOTE') {
          this.generateToteIdList(deliveryItemSize)
        }

        if (items && Array.isArray(items)) {
          const barcodeCreatedDateMap = isKeepStock || priceDateSource == 'MANUAL' ? {} : this.getBarcodeCreatedDateMap()
          const priceDate = new Date().toISOString().slice(0, 10)
          items.forEach((item: any, index: number) => {
            const toteId = mode == 'RANDOM_TOTE' ? this.toteIdList[index] : (mode == 'SINGLE_TOTE' ? this.dispatchForm.get('toteId')?.value : '')
            this.items.push(
              this.createItem(
                item.productName ?? '',
                item.articleNo ?? '',
                item.barcode ?? '',
                isKeepStock ? item.qty : item.assignedQty, //TODO
                isKeepStock ? item.unit : item.crossDock?.unit, //TODO
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
    const externalPrices = JSON.parse(this.dispatchForm.get('externalPrice')?.value)

    if (priceDateSource == 'MANUAL') {
      return {}
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
    console.log(this.dispatchForm)
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

  mapRowCsv(shipmentNo:string,
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
      size += deliveryOrders[i].items.length
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
    const storeCode =inputDeliveryOrders[0]?.po?.storeCode
    const shipmentNo = `SO-${storeCode}-${this.dateUtils.generateCompactDateTime(now)}`

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
      if (mode == 'RANDOM_TOTE') {
        this.generateToteIdList(itemCount)
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

  generateToteIdList(itemCount: number): void {
    const subfixToteCode: string = this.dispatchForm.get('subfixToteCode')?.value
    const runningRandomStart: number = this.dispatchForm.get('startRunningNumber')?.value
    this.toteIdList = []

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

