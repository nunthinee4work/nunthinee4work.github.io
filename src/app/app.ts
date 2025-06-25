import { Component } from '@angular/core';
import { DispatchOrder } from './components/dispatch-order/dispatch-order';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    DispatchOrder,
    CommonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  activeTab = 'dispatchOrder';

  tabs = [
    { id: 'dispatchOrder', label: 'Dispatch Order' },
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
