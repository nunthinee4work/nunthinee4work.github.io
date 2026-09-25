import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';

import { TDDispatchOrder } from './td-dispatch-order';

describe('TDDispatchOrder', () => {
  let component: TDDispatchOrder;
  let fixture: ComponentFixture<TDDispatchOrder>;

  // Dummy data only
  const deliveryOrder = (doNo: string, barcodes: string[]) => ({
    doNo,
    po: { cutOffDeliveryDate: '2026-09-24', pickDate: '2026-09-24' },
    items: barcodes.map(barcode => ({ productName: 'Sample', barcode, assignedQty: 1, unitFactor: 1, unit: 'PC' })),
  });

  beforeEach(async () => {
    // The real app loads the Bootstrap bundle from a CDN (index.html); Karma doesn't
    (window as any).bootstrap = { Modal: class { show() { } hide() { } } };

    await TestBed.configureTestingModule({
      imports: [TDDispatchOrder],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TDDispatchOrder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const paste = (text: string) => {
    component.deliveryOrders.at(0).get('value')!.setValue(text);
    component.onChangedInputDelivery(0);
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default suffix to now (yyyyMMddHHmm) and running number to 1, editable only when ticked', () => {
    const today = component.defaultSubfixToteCode;
    expect(today).toMatch(/^20\d{10}$/);
    expect(component.dispatchForm.value.subfixToteCode).toBe(today);
    expect(component.dispatchForm.value.startRunningNumber).toBe(1);

    component.dispatchForm.patchValue({ customToteCode: true, subfixToteCode: '9999', startRunningNumber: 5 });
    expect(component.dispatchForm.value.subfixToteCode).toBe('9999');

    component.dispatchForm.patchValue({ customToteCode: false });
    expect(component.dispatchForm.value.subfixToteCode).toBe(today);
    expect(component.dispatchForm.value.startRunningNumber).toBe(1);
  });

  it('should keep counting the running number across DOs', () => {
    component.dispatchForm.patchValue({ mode: 'RANDOM_TOTE', customToteCode: true, subfixToteCode: '2026', startRunningNumber: 1 });
    paste(JSON.stringify([deliveryOrder('DO-1', ['111', '222']), deliveryOrder('DO-2', ['333'])]));

    const toteIds = component.items.controls.map(item => (item.get('details') as any).at(0).get('toteId').value as string);
    expect(toteIds.map(id => id.slice(-2))).toEqual(['01', '02', '03']);
    expect(component.duplicateToteIds.size).toBe(0);
  });

  it('should flag a tote id used by two DOs but still allow export', () => {
    component.dispatchForm.patchValue({ mode: 'CUSTOM_TOTE' });
    paste(JSON.stringify([deliveryOrder('DO-1', ['111', '222']), deliveryOrder('DO-2', ['333'])]));
    const tote = (index: number) => (component.items.at(index).get('details') as any).at(0).get('toteId');

    // Same tote inside one DO is fine
    tote(0).setValue('TB0001');
    tote(1).setValue('TB0001');
    expect(component.duplicateToteIds.size).toBe(0);

    // …but not across DOs (case / spaces ignored)
    tote(2).setValue(' tb0001 ');
    expect([...component.duplicateToteIds]).toEqual([['TB0001', ['DO-1', 'DO-2']]]);
    expect(component.duplicateToteOtherDos('TB0001', 'DO-2')).toEqual(['DO-1']);

    // Warning only: export still runs
    spyOn(component, 'validateForm').and.returnValue(false);
    const exportSpy = spyOn(component as any, component.dispatchForm.value.orderFlow === 'CROSS_DOCK' ? 'generateDispatchCrossDock' : 'generateDispatcKeepStock');
    component.onSubmit();
    expect(exportSpy).toHaveBeenCalled();
  });

  it('should allow PL (pallet) in several DOs', () => {
    component.dispatchForm.patchValue({ mode: 'CUSTOM_TOTE' });
    paste(JSON.stringify([deliveryOrder('DO-1', ['111']), deliveryOrder('DO-2', ['333'])]));
    (component.items.at(0).get('details') as any).at(0).get('toteId').setValue('PL');
    (component.items.at(1).get('details') as any).at(0).get('toteId').setValue('PL');
    expect(component.duplicateToteIds.size).toBe(0);
  });

  it("should always use the default suffix and running number in 'Auto – My Prefix' mode", () => {
    component.dispatchForm.patchValue({ mode: 'RANDOM_TOTE', customToteCode: true, subfixToteCode: '9999', startRunningNumber: 7 });
    component.dispatchForm.patchValue({ mode: 'SPECIFY_TOTE' });
    expect(component.modes.find(m => m.id === 'SPECIFY_TOTE')?.name).toBe('Auto – My Prefix');
    expect(component.dispatchForm.value.customToteCode).toBeFalse();
    expect(component.dispatchForm.value.subfixToteCode).toBe(component.defaultSubfixToteCode);
    expect(component.dispatchForm.value.startRunningNumber).toBe(1);

    component.dispatchForm.patchValue({ specifyToteCode: 'TDS, TLS' });
    paste(JSON.stringify([deliveryOrder('DO-1', ['111', '222'])]));
    const toteIds = component.items.controls.map(item => (item.get('details') as any).at(0).get('toteId').value);
    const day = component.defaultSubfixToteCode;
    expect(toteIds).toEqual([`TDS${day}01`, `TLS${day}02`]);
  });

  it('should use 2-digit running numbers and widen only past 99', () => {
    expect(component.runningNumberWidth(1, 5)).toBe(2);   // 01 … 05
    expect(component.runningNumberWidth(1, 99)).toBe(2);  // 01 … 99
    expect(component.runningNumberWidth(1, 100)).toBe(3); // 001 … 100
    expect(component.runningNumberWidth(95, 10)).toBe(3); // 095 … 104
    expect(component.runningNumberWidth(1, 1000)).toBe(4);
  });
});
