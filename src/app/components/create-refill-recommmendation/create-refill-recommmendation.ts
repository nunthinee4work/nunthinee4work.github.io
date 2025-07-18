import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
export class CreateRefillRecommmendation {
  refillForm!: FormGroup;
  sqlStatement = '';

  refillTypes = [
    { id: 'NORMAL', name: 'Normal' },
    { id: 'SPECIAL', name: 'Special' }
  ];

  constructor(private fb: FormBuilder, private toastr: ToastrService) {
    this.refillForm = this.fb.group({
      inputSeparator: ['NEW_LINE'],
      shelfCode: ['', Validators.required],
      storeCode: ['', Validators.required],
      scheduleTime: ['', Validators.required],
      refillType: ['NORMAL', Validators.required]
    });
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
      refillType
    } = this.refillForm.value;

    const cleanString = shelfCode.replace(/["']/g, '');
    const shelfCodes = inputSeparator === 'NEW_LINE'
      ? cleanString.split('\n').filter((line: any) => line.trim() !== '')
      : cleanString.split(',').map((s: any) => s.trim());

    const scheduleTimes = scheduleTime.split(',').map((s: any) => s.trim())
    const today = this.getTodayDayName()
    let payload: any[] = []

    for (let i = 0; i < scheduleTimes.length; i++) {
      if (!this.isValidTimeFormat(scheduleTimes[i])) {
        this.toastr.error(`รูปแบบเวลาไม่ถูกต้อง ${scheduleTimes[i]}`, 'แจ้งเตือน');
        return
      }

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
      refillType: 'NORMAL'
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
