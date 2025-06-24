import { Component } from '@angular/core';
import { DispatchOrderCrossDock } from './components/dispatch-order-cross-dock/dispatch-order-cross-dock';
import { DispatchOrderKeepStock } from './components/dispatch-order-keep-stock/dispatch-order-keep-stock';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    DispatchOrderCrossDock,
    DispatchOrderKeepStock,
    CommonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  activeTab = 'dispatchOrderCrossDock';

  tabs = [
    { id: 'dispatchOrderKeepStock', label: 'Dispatch Order' },
    { id: 'dispatchOrderCrossDock', label: 'Dispatch Order (Cross Dock)' },
    // { id: 'createStockCountRequest', label: 'Stock Count Request' },
    // { id: 'createStockCountGroup', label: 'Stock Count Group' },
    // { id: 'submitStoreStockRecall', label: 'Submit Store Stock Recall 🆕' },
    // { id: 'thaiLocaleCompare', label: 'Thai Locale Compare' },
    // { id: 'unicodeConverter', label: 'Unicode Converter' },
    // { id: 'arrayFormatter', label: 'Array Formatter' },
    // { id: 'removeDashesAndEmptyLines', label: 'Remove Dashes and Empty Lines' },
  ];

  openTab(tabId: string) {
    this.activeTab = tabId;
  }
}
