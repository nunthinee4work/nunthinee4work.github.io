import { Component } from '@angular/core';
import { DispatchOrder } from './components/dispatch-order/dispatch-order';
import { CommonModule } from '@angular/common';
import { ThaiLocaleCompare } from "./components/thai-locale-compare/thai-locale-compare";
import { ArrayFormatter } from "./components/array-formatter/array-formatter";
import { UnicodeConverter } from "./components/unicode-converter/unicode-converter";
import { CreateStockCountRequest } from "./components/create-stock-count-request/create-stock-count-request";
import { CreateStockCountGroup } from "./components/create-stock-count-group/create-stock-count-group";
import { CreateShelf } from './components/create-shelf/create-shelf';
import { CreateRefillRecommmendation } from './components/create-refill-recommmendation/create-refill-recommmendation';

@Component({
  selector: 'app-root',
  imports: [
    DispatchOrder,
    CommonModule,
    ThaiLocaleCompare,
    ArrayFormatter,
    UnicodeConverter,
    CreateStockCountRequest,
    CreateStockCountGroup,
    CreateShelf,
    CreateRefillRecommmendation
],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  activeTab = 'dispatchOrder';

  tabs = [
    { id: 'dispatchOrder', label: 'Dispatch Order' },
    { id: 'createStockCountRequest', label: 'Stock Count Request' },
    { id: 'createStockCountGroup', label: 'Stock Count Group' },
    // { id: 'createShelf', label: 'Shelf' },
    { id: 'createRefillRecommmendation', label: 'Refill Recommendation' },
    // { id: 'submitStoreStockRecall', label: 'Submit Store Stock Recall 🆕' },
    { id: 'thaiLocaleCompare', label: 'Thai Locale Compare' },
    { id: 'unicodeConverter', label: 'Unicode Converter' },
    { id: 'arrayFormatter', label: 'Array Formatter' },
    // { id: 'removeDashesAndEmptyLines', label: 'Remove Dashes and Empty Lines' },
  ];

  openTab(tabId: string) {
    this.activeTab = tabId;
  }
}
