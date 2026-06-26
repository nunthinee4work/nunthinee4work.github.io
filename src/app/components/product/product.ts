import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { CodeBox } from '../../shared/code-box/code-box';
import { RandomButton } from '../../shared/random-button/random-button';

@Component({
  selector: 'app-product',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectComponent,
    CodeBox,
    RandomButton
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss'
})
export class Product {
  productForm!: FormGroup;
  retailPriceForm!: FormGroup
  productRequestOutput: any = ''
  curlRequest: any = ''

  productTypes = [
    { id: 'INVENTORY', name: 'Inventory' },
    { id: 'FIX_ASSET', name: 'Fix Asset' },
    { id: 'STORE_USE', name: 'Store Use' }
  ];

  orderingMethods = [
    { id: 'FIRST_LOT_ORDER,SPECIAL_REQUEST,STORE_REPLENISHMENT', name: 'First Lot, Special Request, Store Replenishment' },
    { id: 'FIRST_LOT_ORDER,SPECIAL_REQUEST', name: 'First Lot, Special Request' },
    { id: 'FRESH_LITE', name: 'Fresh Lite' }
  ];

  readonly DELIVERY_METHODS = {
    SUPPLIER: {
      id: 'SUPPLIER',
      name: 'Supplier (Direct to Store)'
    },
    WAREHOUSE: {
      id: 'TD',
      name: 'Warehouse'
    }
  };

  deliveryMethods: any[] = [];

  units = [
    { id: 'BAG', name: 'BAG' },
    { id: 'BOX', name: 'BOX' },
    { id: 'CAR', name: 'CAR' },
    { id: 'PAC', name: 'PAC' },
    { id: 'PC', name: 'PC' },
    { id: 'SAC', name: 'SAC' },
    { id: 'SET', name: 'SET' },
  ];

  barSizes = [
    { id: 'S', name: 'S' },
    { id: 'M', name: 'M' },
    { id: 'L', name: 'L' },
  ]

  warehouseInformation = [
    {
      "id": "68b1606c4e49b8e8ae19a465",
      "code": "WH001",
      "name": "คลังโพธาราม",
      "type": "Warehouse",
      "wmsCode": "D001",
      "warehouseNameDisplay": "D001-คลังโพธาราม",
      "locationDisplay": "D001-คลังโพธาราม",
      "defaultFirstLot": false,
      "defaultStorageType": [
        "AMBIENT"
      ],
      "allStorageTypes": [
        "AMBIENT",
        "LIFESTYLE",
        "CHILLED",
        "STORE_ITEM",
        "FROZEN",
        "ST_STORAGE"
      ],
      "splitStorageTypes": [
        [
          "AMBIENT"
        ],
        [
          "CHILLED"
        ],
        [
          "STORE_ITEM"
        ],
        [
          "LIFESTYLE"
        ],
        [
          "FROZEN"
        ],
        [
          "ST_STORAGE"
        ]
      ]
    },
    {
      "id": "674d571af83da4cf3d76864d",
      "code": "WH017",
      "name": "คลังบางปะกง",
      "type": "Warehouse",
      "wmsCode": "D002",
      "warehouseNameDisplay": "D002-คลังบางปะกง",
      "locationDisplay": "D002-คลังบางปะกง",
      "defaultFirstLot": false,
      "defaultStorageType": [
        "AMBIENT"
      ],
      "allStorageTypes": [
        "AMBIENT",
        "CHILLED",
        "STORE_ITEM",
        "LIFESTYLE",
        "FROZEN",
        "ST_STORAGE"
      ],
      "splitStorageTypes": [
        [
          "AMBIENT"
        ],
        [
          "CHILLED"
        ],
        [
          "STORE_ITEM"
        ],
        [
          "LIFESTYLE"
        ],
        [
          "FROZEN"
        ],
        [
          "ST_STORAGE"
        ]
      ]
    },
    {
      "id": "674d55f4f83da4cf3d76864b",
      "code": "WH018",
      "name": "คลังขอนแก่น",
      "type": "Warehouse",
      "wmsCode": "D004",
      "warehouseNameDisplay": "D004-คลังขอนแก่น",
      "locationDisplay": "D004-คลังขอนแก่น",
      "defaultFirstLot": false,
      "defaultStorageType": [
        "AMBIENT"
      ],
      "allStorageTypes": [
        "AMBIENT",
        "CHILLED",
        "STORE_ITEM",
        "LIFESTYLE",
        "FROZEN"
      ],
      "splitStorageTypes": [
        [
          "AMBIENT"
        ],
        [
          "CHILLED"
        ],
        [
          "STORE_ITEM"
        ],
        [
          "LIFESTYLE"
        ],
        [
          "FROZEN"
        ]
      ]
    },
    {
      "id": "697b1c4115bfa9bbad670669",
      "code": "WH005",
      "name": "คลังบุรีรัมย์",
      "type": "Warehouse",
      "wmsCode": "D005",
      "warehouseNameDisplay": "D005-คลังบุรีรัมย์",
      "locationDisplay": "D005-คลังบุรีรัมย์",
      "defaultFirstLot": false,
      "defaultStorageType": [
        "AMBIENT"
      ],
      "allStorageTypes": [
        "AMBIENT",
        "LIFESTYLE",
        "CHILLED",
        "STORE_ITEM",
        "FROZEN",
        "ST_STORAGE"
      ],
      "splitStorageTypes": [
        [
          "AMBIENT"
        ],
        [
          "CHILLED"
        ],
        [
          "STORE_ITEM"
        ],
        [
          "LIFESTYLE"
        ],
        [
          "FROZEN"
        ],
        [
          "ST_STORAGE"
        ]
      ]
    },
    {
      "id": "69c0e9a41bec0eec7c27eb81",
      "code": "WH999",
      "name": "คลังบุรีรัมย์-Inactive",
      "type": "Warehouse",
      "wmsCode": "D999",
      "warehouseNameDisplay": "D999-คลังบุรีรัมย์-Inactive",
      "locationDisplay": "D999-คลังบุรีรัมย์-Inactive",
      "defaultFirstLot": false,
      "defaultStorageType": [
        "AMBIENT"
      ],
      "allStorageTypes": [
        "AMBIENT",
        "LIFESTYLE",
        "CHILLED",
        "STORE_ITEM",
        "FROZEN",
        "ST_STORAGE"
      ],
      "splitStorageTypes": [
        [
          "AMBIENT"
        ],
        [
          "CHILLED"
        ],
        [
          "STORE_ITEM"
        ],
        [
          "LIFESTYLE"
        ],
        [
          "FROZEN"
        ],
        [
          "ST_STORAGE"
        ]
      ]
    },
    {
      "id": "64362c06a2b306104f2f6791",
      "code": "WH011",
      "name": "คลังบางวัว 2",
      "type": "Warehouse",
      "wmsCode": "TDEA-04",
      "warehouseNameDisplay": "TDEA-04-คลังบางวัว 2",
      "locationDisplay": "TDEA-04-คลังบางวัว 2",
      "defaultFirstLot": false,
      "defaultStorageType": null,
      "allStorageTypes": null,
      "splitStorageTypes": null
    }
  ]

  freshLiteCategory = [
    { code: "0001", name: "ดัชมิลล์" },
    { code: "0002", name: "บีทาเก้น" },
    { code: "0003", name: "ขนมปัง โกลด์เบรด" },
    { code: "0004", name: "ขนมปัง เอพลัส" },
    { code: "0005", name: "ไอศกรีม วอลล์" },
    { code: "0006", name: "ขนมปัง ฟาร์มเฮ้าส์" },
    { code: "0007", name: "น้ำแข็ง" },
    { code: "0008", name: "ข้าวสาร ขอนแก่นกู่ทอง" },
    { code: "0009", name: "ถ่ายเอกสาร" },
    { code: "0010", name: "ขนมปัง โออิชิฟู้ด" },
    { code: "0011", name: "น้ำแข็งยูนิต" },
    { code: "0012", name: "ขนมปัง มิงโก้" },
    { code: "0013", name: "Bao Café" },
    { code: "0014", name: "ไอศกรีม มิงโก้" },
    { code: "0015", name: "เครื่องดื่ม" },
    { code: "0016", name: "ค่าบริการซื้อเชื่อ" },
    { code: "0017", name: "ข้าวสาร (ส่งตรง)" },
    { code: "0018", name: "น้ำดื่ม (ส่งตรง)" },
    { code: "0019", name: "ไข่ไก่ (ส่งตรง)" },
    { code: "0020", name: "ยาเส้น (ส่งตรง)" },
    { code: "0021", name: "น้ำแข็งตัก" },
    { code: "0022", name: "ห้ามผูก supplier" },
    { code: "0023", name: "tttest" },
    { code: "0024", name: "ขนมปัง2 โออิชิฟู้ด 2" },
    { code: "0025", name: "น้ำแข็งยูนิต 2" },
    { code: "0026", name: "ข้าวสาร ขอนแก่นกู่ทอง1 ข้าวสาร ขอนแก่นกู่ทอง2 ข้าวสาร ขอนแก่นกู่ทอง3 ข้าวสาร ขอนแก่นกู่ทอง4 ข้าวสารร" },
    { code: "0027", name: "น้ำดื่ม" },
    { code: "0028", name: "ขนมปัง ฟาร์มเฮ้าส์ 2" },
    { code: "0029", name: "ขนมปัง เอพลัส 2" },
    { code: "0030", name: "น้ำแข็ง น้ำแข็ง น้ำแข็ง" },
    { code: "0032", name: "Bao Cafe" },
    { code: "0054", name: "BB" },
    { code: "0056", name: "BB_1" },
    { code: "0065", name: "เทสเพิ่ม 3" },
    { code: "0073", name: "testa" },
    { code: "0074", name: "AAA" },
    { code: "0075", name: "AB" },
    { code: "0077", name: "Bakery & Pastry" },
    { code: "0078", name: "jaao" },
    { code: "0079", name: "123213" },
    { code: "0080", name: "2.    3.    4." },
    { code: "0081", name: "12321321" },
    { code: "0082", name: "2.          44" },
    { code: "0083", name: "222222" },
    { code: "0084", name: "2.          4" },
    { code: "0085", name: "Fresh Lite @ Home สด สะอาด อร่อย เบา สไตล์คุณ" },
    { code: "0086", name: "3." }
  ]

  brands = [
    'ติ่งฟง',
    'ดอยคำ',
    'โออิชิ',
    'อิชิตัน',
    'โคคา-โคล่า',
    'เป๊ปซี่',
    'เลย์',
    'วอลล์',
    'ฟาร์มเฮ้าส์',
    'มาม่า',
    'ไวไว',
    'ดัชมิลล์',
    'บีทาเก้น',
    'ทิปโก้',
    'เนสกาแฟ',
    'ลิปตัน',
    'ซีพี',
    'เบทาโกร',
    'ยูโร่',
    'มิสเตอร์มัสเซิล',
    'แฟ้บ',
    'เปา',
    'ซันไลต์',
    'คลอร็อกซ์',
    '3M',
    'สเต็ดเลอร์',
    'มาสเตอร์อาร์ต',
    'เต็ดตร้า',
    'บิ๊กซี',
    'โลตัส'
  ];

  products = [
    // 🥤 เครื่องดื่ม (FOOD)
    { name: 'น้ำดื่ม', type: 'FOOD', unit: 'ml' },
    { name: 'น้ำแร่', type: 'FOOD', unit: 'ml' },
    { name: 'น้ำอัดลม', type: 'FOOD', unit: 'ml' },
    { name: 'ชาเขียว', type: 'FOOD', unit: 'ml' },
    { name: 'ชาดำ', type: 'FOOD', unit: 'ml' },
    { name: 'กาแฟสำเร็จรูป', type: 'FOOD', unit: 'ml' },
    { name: 'กาแฟพร้อมดื่ม', type: 'FOOD', unit: 'ml' },
    { name: 'นมสด', type: 'FOOD', unit: 'ml' },
    { name: 'นมถั่วเหลือง', type: 'FOOD', unit: 'ml' },
    { name: 'นมเปรี้ยว', type: 'FOOD', unit: 'ml' },
    { name: 'โยเกิร์ต', type: 'FOOD', unit: 'ml' },

    // 🍜 อาหาร (FOOD)
    { name: 'บะหมี่กึ่งสำเร็จรูป', type: 'FOOD', unit: 'g' },
    { name: 'ข้าวสาร', type: 'FOOD', unit: 'g' },
    { name: 'น้ำมันพืช', type: 'FOOD', unit: 'g' },
    { name: 'น้ำปลา', type: 'FOOD', unit: 'g' },
    { name: 'ซอสปรุงรส', type: 'FOOD', unit: 'g' },
    { name: 'ซอสมะเขือเทศ', type: 'FOOD', unit: 'g' },
    { name: 'ซอสหอยนางรม', type: 'FOOD', unit: 'g' },
    { name: 'ขนมปัง', type: 'FOOD', unit: 'g' },
    { name: 'คุกกี้', type: 'FOOD', unit: 'g' },
    { name: 'บิสกิต', type: 'FOOD', unit: 'g' },
    { name: 'มันฝรั่งทอด', type: 'FOOD', unit: 'g' },
    { name: 'ไอศกรีม', type: 'FOOD', unit: 'g' },
    { name: 'ลูกอม', type: 'FOOD', unit: 'g' },
    { name: 'ช็อกโกแลต', type: 'FOOD', unit: 'g' },

    // 🧼 ของใช้ในบ้าน (NON_FOOD)
    { name: 'น้ำยาล้างจาน', type: 'NON_FOOD', unit: null },
    { name: 'ผงซักฟอก', type: 'NON_FOOD', unit: null },
    { name: 'น้ำยาปรับผ้านุ่ม', type: 'NON_FOOD', unit: null },
    { name: 'น้ำยาถูพื้น', type: 'NON_FOOD', unit: null },
    { name: 'สเปรย์ปรับอากาศ', type: 'NON_FOOD', unit: null },
    { name: 'กระดาษทิชชู่', type: 'NON_FOOD', unit: null },
    { name: 'ถุงขยะ', type: 'NON_FOOD', unit: null },
    { name: 'ฟองน้ำล้างจาน', type: 'NON_FOOD', unit: null },

    // ✏️ เครื่องเขียน (NON_FOOD)
    { name: 'ปากกาลูกลื่น', type: 'NON_FOOD', unit: null },
    { name: 'ดินสอ', type: 'NON_FOOD', unit: null },
    { name: 'ยางลบ', type: 'NON_FOOD', unit: null },
    { name: 'ไม้บรรทัด', type: 'NON_FOOD', unit: null },
    { name: 'ปากกาเมจิก', type: 'NON_FOOD', unit: null },
    { name: 'ปากกาไฮไลท์', type: 'NON_FOOD', unit: null },
    { name: 'สมุดโน้ต', type: 'NON_FOOD', unit: null },
    { name: 'กระดาษ A4', type: 'NON_FOOD', unit: null },
    { name: 'แฟ้มเอกสาร', type: 'NON_FOOD', unit: null },
    { name: 'กาวแท่ง', type: 'NON_FOOD', unit: null }
  ];

  flavors = [
    'รสดั้งเดิม',
    'รสสตรอว์เบอร์รี่',
    'รสช็อกโกแลต',
    'รสวานิลลา',
    'รสกาแฟ',
    'รสส้ม',
    'รสมะนาว',
    'รสลิ้นจี่',
    'รสบลูเบอร์รี่',
    'รสเผ็ด',
    'สูตรน้ำตาลน้อย',
    'สูตรไม่มีน้ำตาล',
    'รสแตงโม',
    'รสองุ่น',
    'รสแอปเปิล',
    'รสโยเกิร์ต',
    'รสชาเขียว',
    'รสชาไทย',
    'รสคาราเมล',
    'รสทุเรียน'
  ];

  colors = [
    'สีแดง',
    'สีน้ำเงิน',
    'สีเขียว',
    'สีเหลือง',
    'สีดำ',
    'สีขาว',
    'สีชมพู',
    'สีเทา',
    'สีม่วง',
    'สีส้ม'
  ];

  constructor(private fb: FormBuilder, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.productForm = this.fb.group({
      articleNo: [null, [Validators.required, Validators.maxLength(100)]],
      productName: [null, [Validators.required, Validators.maxLength(100)]],
      productDisplayName: [null, [Validators.required, Validators.maxLength(25)]],
      brand: [null, Validators.required],
      maximumNormalPrice: [null, Validators.required],
      productType: [null, Validators.required],
      orderingMethod: [null, Validators.required],
      freshLiteCategory: [{ value: null, disabled: true }],
      deliveryMethod: [null, Validators.required],
      wholesalePriceIncVat: [null, Validators.required],
    })

    this.retailPriceForm = this.fb.group({
      items: this.fb.array([
        this.fb.group({
          barcode: [null, Validators.required],
          barSize: [null, Validators.required],
          unit: [null, Validators.required],
          unitFactor: [null, Validators.required],
          retailPrice: [null, Validators.required],
          // retailPriceEffectiveDate: ['', Validators.required],
          pickingUnit: [true, Validators.required]
        })
      ])
    })

    this.updateOrderingMethods(this.productForm.get('productType')?.value);

    this.productForm.get('productType')?.valueChanges.subscribe(productType => {
      this.updateOrderingMethods(productType);
    });

    this.productForm.get('orderingMethod')?.valueChanges.subscribe(orderingMethod => {
      this.updateDeliveryMethods(orderingMethod);
    });

    const deliveryMethod = this.productForm.get('deliveryMethod');
    const freshLiteCategory = this.productForm.get('freshLiteCategory');

    deliveryMethod?.valueChanges.subscribe(value => {
      if (value === 'SUPPLIER') {
        freshLiteCategory?.enable();
        freshLiteCategory?.setValidators([Validators.required]);
      } else {
        freshLiteCategory?.reset();
        freshLiteCategory?.clearValidators();
        freshLiteCategory?.disable();
      }

      freshLiteCategory?.updateValueAndValidity();
    });
  }

  get items(): FormArray {
    return this.retailPriceForm.get('items') as FormArray;
  }

  private createItem(): FormGroup {
    return this.fb.group({
      barcode: ['', Validators.required],
      barSize: [null, Validators.required],
      unit: [null, Validators.required],
      unitFactor: ['', Validators.required],
      retailPrice: ['', Validators.required],
      // retailPriceEffectiveDate: ['', Validators.required],
      pickingUnit: [false, Validators.required]
    });
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  createDetail(pickedQty?: number, toteId?: string): FormGroup {
    return this.fb.group({
      pickQty: [pickedQty, Validators.required],
      toteId: [toteId, Validators.required]
    });
  }

  private updateOrderingMethods(productType: string): void {
    switch (productType) {
      case 'INVENTORY':
        this.orderingMethods = [
          {
            id: 'FIRST_LOT_ORDER,SPECIAL_REQUEST,STORE_REPLENISHMENT',
            name: 'First Lot, Special Request, Store Replenishment'
          },
          {
            id: 'FRESH_LITE',
            name: 'Fresh Lite'
          }
        ];
        break;

      case 'FIX_ASSET':
        this.orderingMethods = [
          {
            id: 'FIRST_LOT_ORDER,SPECIAL_REQUEST',
            name: 'First Lot, Special Request'
          }
        ];
        break;

      case 'STORE_USE':
        this.orderingMethods = [
          {
            id: 'FIRST_LOT_ORDER,SPECIAL_REQUEST,STORE_REPLENISHMENT',
            name: 'First Lot, Special Request, Store Replenishment'
          }
        ];
        break;
    }

    this.productForm.get('orderingMethod')?.reset();
  }

  private updateDeliveryMethods(orderingMethod: string): void {
    if (orderingMethod === 'FRESH_LITE') {
      this.deliveryMethods = [
        this.DELIVERY_METHODS.SUPPLIER
      ];
    } else {
      this.deliveryMethods = [
        this.DELIVERY_METHODS.WAREHOUSE,
        this.DELIVERY_METHODS.SUPPLIER
      ];
    }

    this.productForm.get('deliveryMethod')?.reset();
  }

  buildRequest(): any {
    const product = this.productForm.value
    const retail = this.retailPriceForm.value

    let priceIncVat = Number(product.wholesalePriceIncVat)
    let vatPct = 7;
    let priceExcVat = Math.round((priceIncVat / (1 + vatPct / 100)) * 1e6) / 1e6;
    let vat = Math.round((priceIncVat - priceExcVat) * 1e6) / 1e6;
    let tdGp = Math.round((priceExcVat - priceIncVat) * 1e6) / 1e6;
    let gpPct = Math.round((priceExcVat - priceIncVat) * 1e6) / 1e6;

    return {
      status: 'DRAFT',
      type: 'NEW',
      importId: null,
      articleType: 'M',
      version: 0,
      useCJProduct: false,

      productDetail: {
        tdProduct: {
          version: 0,
          useCJProduct: false,

          articleNo: product.articleNo,
          productName: product.productName,
          maximumNormalPrice: Number(product.maximumNormalPrice),

          pickingUnitBarcode: retail.items.find((item: { pickingUnit: boolean; barcode: string }) => item.pickingUnit)?.barcode ?? null,

          supplierRefNumber: null,
          productStatus: 'ACTIVE',
          productImages: [{
            id: "6a3e30a127cd200f864ed387",
            filePath: "td_assortments/20260626075617091.png"
          }],
          productDisplayName: product.productDisplayName,
          brand: product.brand,
          vat: true,
          shelfLife: 180,
          minimumShelfLife: 150,
          standardGp: 10,
          productTier: "Non-Core",
          highMargin: false,

          productType: product.productType,

          productStandard: "FDA",
          cbgProduct: "Other",
          exclusiveProduct: null,
          productGrading: "CC",
          productRecommend: false,
          estSalesQty: null,
          estSalesValue: null,
          sellingChannel: "CJ",
          restrictedItem: false,
          restrictedAlcoholSaleTime: false,
          size: 1,
          uom: "UOM00001",
          flavor: "test",
          gradingGroup: null,
          productLocationGuideline: "BEV",
          segment: "SEG00001",
          family: "20000",
          classCode: "20600",
          subClass: "20601",
          articleType: "M",
          allowToRent: false,
          rentalPerMonth: null,

          orderingMethods: product.orderingMethod.split(','),
          freshLiteCategory: product.deliveryMethod == 'TD' ? null : product.freshLiteCategory,
          deliveryMethod: product.deliveryMethod,
          warehouses: product.deliveryMethod == 'TD' ? this.warehouseInformation : [],
          allowToDestroy: true,
          demoItem: false,
          billOfMaterial: false,
          tags: []
        },

        cjProduct: {},

        barcodes: retail.items.map((item: any) => this.buildBarcode(item, product.articleNo)),

        effectiveWholesalePrice: {
          id: null,
          articleNo: product.articleNo,
          priceIncVat: Number(product.wholesalePriceIncVat),
          vat: vat,
          priceExcVat: priceExcVat,
          tdGp: tdGp,
          gpPct: gpPct,
          vatPct: vatPct,
          version: null
        },

        scheduleWholesalePrice: {},

        maximumNormalPrice: Number(product.maximumNormalPrice),

        tdMovingAvg: null,

        supplierPrices: []
      },

      articleNo: product.articleNo,
      productName: product.productName,
      productType: product.productType,
      isSubmitted: true,
      manualAddSupplierPrices: null,
      isUpdatedSupplierPrice: true,
      isForceSubmit: false
    };
  }

  private buildBarcode(item: any, articleNo: string): any {
    let priceIncVat = Number(item.retailPrice);
    let vatPct = 7;

    let priceExcVat = Math.round((priceIncVat / (1 + vatPct / 100)) * 1e6) / 1e6;
    let vat = Math.round((priceIncVat - priceExcVat) * 1e6) / 1e6;

    return {
      tdBarcode: {
        articleNo,
        barcode: item.barcode,
        barcodeStatus: '',
        barSize: item.barSize,
        unit: item.unit,
        unitFactor: Number(item.unitFactor),
        weight: 1,
        height: 1,
        width: 1,
        length: 1,
        allowInstallment: false,

        effectiveRetailPrice: {
          articleNo,
          barcode: item.barcode,
          priceIncVat: priceIncVat,
          effectiveDate: null,
          vat: vat,
          vatPct: vatPct,
          priceExcVat: priceExcVat
        },

        scheduleRetailPrice: null
      },

      cjBarcode: null
    };
  }

  randomCode(length: number = 8): string {
    let result = '';

    while (result.length < length) {
      result += Math.floor(Math.random() * 10).toString();
    }

    return result.slice(0, length);
  }

  generateArticleNo(): void {
    const articleNo = this.randomCode(8);

    this.productForm.patchValue({
      articleNo: articleNo
    });
  }

  generateBarcode(index: number): void {
    const barcode = this.randomCode(10);

    const items = this.retailPriceForm.get('items') as FormArray;
    const group = items.at(index);

    group.patchValue({
      barcode: `885${barcode}`
    });
  }

  validateSinglePickingUnit(): boolean {
    const items = this.retailPriceForm.get('items') as FormArray;

    const pickingUnits = items.controls.filter(
      (ctrl) => ctrl.get('pickingUnit')?.value === true
    );

    return pickingUnits.length <= 1;
  }

  submit(): void {
    if (!this.isFormValid()) return;

    const request = this.buildRequest();

    this.curlRequest = `
curl --location '{{cjx-api}/tdproducts/requests/submit' \
--header 'x-host: product.api.tdtech.app' \
--header 'Content-Type: application/json' \
--data '${JSON.stringify(request, null, 2)}'
  `.trim();

    this.productRequestOutput = JSON.stringify(request, null, 2);
  }

  isFormValid(): boolean {
    const productInvalid = this.productForm.invalid;
    const retailInvalid = this.retailPriceForm.invalid;

    // check picking unit rule (ต้องมีได้แค่ 1)
    const items = this.retailPriceForm.get('items') as FormArray;

    const pickingUnits = items.controls.filter(
      ctrl => ctrl.get('pickingUnit')?.value === true
    );

    const pickingUnitInvalid = pickingUnits.length > 1;

    if (productInvalid || retailInvalid || pickingUnitInvalid) {

      this.productForm.markAllAsTouched();
      this.retailPriceForm.markAllAsTouched();

      if (pickingUnitInvalid) {
        this.toastr.error('Picking Unit ต้องเลือกอย่างใดอย่างหนึ่ง', 'แจ้งเตือน');
      } else {
        this.toastr.error('Invalid form', 'แจ้งเตือน');
      }

      return false;
    }

    return true;
  }

  randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  randomNumber(min: number, max: number, step: number = 10): number {
    const steps = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
  }

  randomProduct(): {
    brand: string;
    productName: string;
  } {
    const item = this.randomItem(this.products);
    const brand = this.randomItem(this.brands);

    const extra =
      item.type === 'FOOD'
        ? this.randomItem(this.flavors)
        : this.randomItem(this.colors);

    let unitText = '';

    // 👉 FOOD เท่านั้นมี unit + random 100–1000
    if (item.unit) {
      const size = this.randomNumber(100, 1000);
      unitText = ` ${size}${item.unit}`;
    }

    return {
      brand,
      productName: `${brand}${item.name}${extra}${unitText}`
    };
  }

  generateProduct(): void {
    const { brand, productName } = this.randomProduct();

    this.productForm.patchValue({
      brand,
      productName,
      productDisplayName: productName
    });

    this.productForm.get('productName')?.markAsTouched();
    this.productForm.get('productName')?.markAsDirty();
    this.productForm.get('productName')?.updateValueAndValidity();

        this.productForm.get('productDisplayName')?.markAsTouched();
    this.productForm.get('productDisplayName')?.markAsDirty();
    this.productForm.get('productDisplayName')?.updateValueAndValidity();
  }

  clearForm(): void {
    // reset main form
    this.productForm.reset();

    // reset array form (retail items)
    this.retailPriceForm = this.fb.group({
      items: this.fb.array([
        this.fb.group({
          barcode: [null, Validators.required],
          barSize: [null, Validators.required],
          unit: [null, Validators.required],
          unitFactor: [null, Validators.required],
          retailPrice: [null, Validators.required],
          // retailPriceEffectiveDate: ['', Validators.required],
          pickingUnit: [true, Validators.required]
        })
      ])
    })

    // optional: mark pristine / untouched
    this.productForm.markAsPristine();
    this.productForm.markAsUntouched();

    this.retailPriceForm.markAsPristine();
    this.retailPriceForm.markAsUntouched();

    this.curlRequest = ''
    this.productRequestOutput = ''
  }
}
