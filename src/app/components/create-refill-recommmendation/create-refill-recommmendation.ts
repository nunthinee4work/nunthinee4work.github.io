import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-refill-recommmendation',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CopyButton,
    NgSelectComponent,
  ],
  templateUrl: './create-refill-recommmendation.html',
  styleUrl: './create-refill-recommmendation.scss'
})
export class CreateRefillRecommmendation implements OnInit {
  refillForm!: FormGroup;
  sqlStatement = '';

  refillTypes = [
    { id: 'NORMAL', name: 'Normal' },
    { id: 'SPECIAL', name: 'Special' }
  ];

  scheduleTimeTypes = [
    { id: 'ALL_DAY', name: '09:00 - 18:00', value: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'] },
    { id: 'MORNING', name: '09:00 - 12:30', value: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'] },
    { id: 'AFTERNOON', name: '13:00 - 18:00', value: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'] },
    { id: 'NIGHT', name: '18:30 - 23:30', value: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'] },
    { id: 'CUSTOM', name: 'Custom' }
  ];

  constructor(private fb: FormBuilder, private toastr: ToastrService) {
    this.refillForm = this.fb.group({
      inputSeparator: ['NEW_LINE'],
      shelfCode: ['', Validators.required],
      storeCode: ['', Validators.required],
      scheduleTime: [''],
      refillType: ['NORMAL', Validators.required],
      scheduleTimeType: ['ALL_DAY', Validators.required]
    });
  }
  ngOnInit(): void {
    this.refillForm.get('refillType')?.valueChanges.subscribe(refillType => {
      const shelfCodeControl = this.refillForm.get('shelfCode');

      if (refillType === 'NORMAL') {
        shelfCodeControl?.setValidators([Validators.required])
      } else {
        shelfCodeControl?.clearValidators();
      }

      shelfCodeControl?.updateValueAndValidity();
    })

    this.refillForm.get('scheduleTimeType')?.valueChanges.subscribe(scheduleTimeType => {
      const scheduleTimeControl = this.refillForm.get('scheduleTime');

      if (scheduleTimeType === 'CUSTOM') {
        scheduleTimeControl?.setValidators([Validators.required])
      } else {
        scheduleTimeControl?.clearValidators();
      }

      scheduleTimeControl?.updateValueAndValidity();
    })
  }

  createScriptRefillRecommendation() {
    if (this.refillForm.invalid || this.refillForm.invalid) {
      this.refillForm.markAllAsTouched();
      this.toastr.error('กรุณากรอกข้อมูล', 'แจ้งเตือน');
      return
    }

    const {
      inputSeparator,
      shelfCode,
      storeCode,
      scheduleTime,
      refillType,
      scheduleTimeType
    } = this.refillForm.value;

    const cleanString = shelfCode.replace(/["'\t ]+/g, '');
    const shelfCodes = inputSeparator === 'NEW_LINE'
      ? cleanString.split('\n').filter((line: any) => line.trim() !== '')
      : cleanString.split(',').map((s: any) => s.trim());

    const scheduleTimes = scheduleTimeType != 'CUSTOM' ?
      this.scheduleTimeTypes.find(t => t.id === scheduleTimeType)?.value :
      scheduleTime.split(',').map((s: any) => s.trim())

    const today = this.getTodayDayName()
    let payload: any[] = []

    for (let i = 0; i < scheduleTimes.length; i++) {
      if (!this.isValidTimeFormat(scheduleTimes[i])) {
        this.toastr.error(`รูปแบบเวลาไม่ถูกต้อง ${scheduleTimes[i]}`, 'แจ้งเตือน');
        return
      }

      if (refillType == 'NORMAL') {
        for (let j = 0; j < shelfCodes.length; j++) {
          payload.push({
            day: today,
            code: storeCode,
            time: scheduleTimes[i],
            deadline: "23:30",
            shelfCode: shelfCodes[j],
            refillType: refillType,
          })
        }
      } else {
        payload.push({
          day: today,
          code: storeCode,
          time: scheduleTimes[i],
          deadline: "23:30",
          shelfCode: '',
          refillType: refillType,
        })
      }
    }

    const aggregateId = this.generateShortId(8);
    this.sqlStatement = this.generateInsertSQL(aggregateId, payload, storeCode);
  }

  generateInsertSQL(
    aggregateId: string,
    payload: any[],
    storeCode: string
  ): string {
    const jsonPayload = JSON.stringify(payload).replace(/'/g, "''");
    const sql = `
      INSERT INTO pos_mgr.outbox_events
      (aggregate_type, aggregate_id, "type", payload, doc_no, date_time)
      VALUES(
        'pos_mgr',
        '${aggregateId}-${storeCode}',
        'refillRecommendationCalculate',
        '${jsonPayload}'::jsonb,
        NULL,
        CURRENT_TIMESTAMP
      );`;
    return sql.trim();
  }

  clearFormatter() {
    this.refillForm.reset({
      inputSeparator: 'NEW_LINE',
      shelfCode: '',
      storeCode: '',
      scheduleTime: '',
      refillType: 'NORMAL',
      scheduleTimeType: 'ALL_DAY'
    });
    this.sqlStatement = '';
  }

  generateShortId(length: number = 8): string {
    return Math.random().toString(16).slice(2, 2 + length);
  }

  getTodayDayName(): string {
    const today = new Date();
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return dayNames[today.getDay()];
  }

  isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    return timeRegex.test(time);
  }
}
