import { afterNextRender, ChangeDetectorRef, Component, ElementRef, HostListener, inject, isDevMode, ViewChild } from '@angular/core';
import { DispatchOrder } from './components/dispatch-order/dispatch-order';
import { CommonModule } from '@angular/common';
import { ThaiLocaleCompare } from "./components/thai-locale-compare/thai-locale-compare";
import { ArrayFormatter } from "./components/array-formatter/array-formatter";
import { UnicodeConverter } from "./components/unicode-converter/unicode-converter";
import { CreateStockCountRequest } from "./components/create-stock-count-request/create-stock-count-request";
import { CreateStockCountGroup } from "./components/create-stock-count-group/create-stock-count-group";
import { CreateShelf } from './components/create-shelf/create-shelf';
import { CreateRefillRecommmendation } from './components/create-refill-recommmendation/create-refill-recommmendation';
import { TDDispatchOrder } from './components/td-dispatch-order/td-dispatch-order';
import { ProductTag } from './components/product-tag/product-tag';
import { BarcodeGenerator } from './components/barcode-generator/barcode-generator';
import { JsonViewer } from './components/json-viewer/json-viewer';
import { TextCompare } from './components/text-compare/text-compare';
import { WordCounter } from './components/word-counter/word-counter';
import { EpochConverter } from './components/epoch-converter/epoch-converter';
import { CronSchedule } from './components/cron-schedule/cron-schedule';
import { ListTools } from './components/list-tools/list-tools';
import { TextToolkit } from './components/text-toolkit/text-toolkit';
import { AccessIdentity, AccessUtils } from './utils/access.utils';

/** Fired on window when a link asks a toolkit to open one of its tabs; detail = { key, value } */
export const TOOLKIT_SECTION_EVENT = 'toolkit-section';

interface NavTab {
  id: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  tabs: NavTab[];
  /** Pinned / Recent shortcut sections rendered above the regular groups */
  shortcut?: boolean;
}

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
    CreateRefillRecommmendation,
    TDDispatchOrder,
    ProductTag,
    BarcodeGenerator,
    JsonViewer,
    TextCompare,
    WordCounter,
    EpochConverter,
    CronSchedule,
    ListTools,
    TextToolkit
],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private static readonly DEFAULT_TAB = 'dispatchOrder';
  /**
   * Retired tab ids -> their replacement, so old links / saved pins keep working.
   * `section` also opens the matching in-page tab (the toolkit reads that localStorage key on init).
   */
  private static readonly TAB_ALIASES: Record<string, { tab: string; section?: { key: string; value: string } }> = {
    arrayFormatter: { tab: 'listTools' },
    thaiLocaleCompare: { tab: 'listTools' },
    cronSchedule: { tab: 'timeConverter', section: { key: 'timeToolkit.section', value: 'cron' } },
    jsonViewer: { tab: 'textToolkit', section: { key: 'textToolkit.section', value: 'json' } },
    textCompare: { tab: 'textToolkit', section: { key: 'textToolkit.section', value: 'compare' } },
    wordCounter: { tab: 'textToolkit', section: { key: 'textToolkit.section', value: 'count' } },
    unicodeConverter: { tab: 'textToolkit', section: { key: 'textToolkit.section', value: 'unicode' } },
  };
  private static readonly STORAGE_KEYS = {
    activeTab: 'app.activeTab',
    sidebarCollapsed: 'app.sidebarCollapsed',
    theme: 'app.theme',
    pinnedTabs: 'app.pinnedTabs',
    recentTabs: 'app.recentTabs',
  };
  private static readonly MAX_RECENT = 3;
  private static readonly DEV_IDENTITY: AccessIdentity = { email: 'dummy@mail.com' };

  /** Show the Recent section (tracking always runs; set false to hide it without losing history) */
  showRecent = true;

  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  activeTab = App.DEFAULT_TAB;
  searchText = '';
  sidebarCollapsed = false;
  darkMode = false;
  pinnedIds: string[] = [];
  recentIds: string[] = [];
  isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  /** Signed-in Cloudflare Access user; null locally (no Access in front of ng serve) */
  identity: AccessIdentity | null = null;
  readonly logoutUrl = AccessUtils.LOGOUT_URL;


  navGroups: NavGroup[] = [
    {
      label: 'Order',
      tabs: [
        { id: 'dispatchOrder', label: 'CJX Dispatch Order', icon: 'fa-truck-fast' },
        { id: 'tdDispatchOrder', label: 'TD Dispatch Order', icon: 'fa-truck' },
      ],
    },
    {
      label: 'Stock & Product',
      tabs: [
        { id: 'createStockCountRequest', label: 'Stock Count Request', icon: 'fa-clipboard-list' },
        { id: 'productTag', label: 'Check Product Tag', icon: 'fa-tags' },
        // { id: 'createStockCountGroup', label: 'Stock Count Group', icon: 'fa-layer-group' },
        // { id: 'createShelf', label: 'Shelf', icon: 'fa-table-cells' },
        // { id: 'createRefillRecommmendation', label: 'Refill Recommendation', icon: 'fa-rotate' },
        // { id: 'submitStoreStockRecall', label: 'Submit Store Stock Recall 🆕', icon: 'fa-rotate-left' },
      ],
    },
    {
      label: 'Utilities',
      tabs: [
        { id: 'barcodeGenerator', label: 'Barcode Generator', icon: 'fa-barcode' },
        { id: 'listTools', label: 'List Formatter', icon: 'fa-list-check' },
        // Merged into List Formatter (old links redirect via TAB_ALIASES):
        // { id: 'thaiLocaleCompare', label: 'Thai Text Sorter', icon: 'fa-arrow-down-a-z' },
        // { id: 'arrayFormatter', label: 'Array Formatter', icon: 'fa-list-ol' },
        { id: 'textToolkit', label: 'Text Toolkit', icon: 'fa-file-lines' },
        // Tabs inside Text Toolkit now (old links redirect via TAB_ALIASES):
        // { id: 'jsonViewer', label: 'JSON Viewer', icon: 'fa-table-cells' },
        // { id: 'textCompare', label: 'Text Compare', icon: 'fa-code-compare' },
        // { id: 'wordCounter', label: 'Word Counter', icon: 'fa-spell-check' },
        { id: 'timeConverter', label: 'Time Toolkit', icon: 'fa-clock' },
        // Moved into Time Toolkit as a tab (old links redirect via TAB_ALIASES):
        // { id: 'cronSchedule', label: 'Cron Schedule', icon: 'fa-calendar-check' },
        // { id: 'unicodeConverter', label: 'Unicode Converter', icon: 'fa-font' }, // tab in Text Toolkit
        // { id: 'removeDashesAndEmptyLines', label: 'Remove Dashes and Empty Lines', icon: 'fa-eraser' },
      ],
    },
  ];

  constructor() {
    this.sidebarCollapsed = App.readStorage(App.STORAGE_KEYS.sidebarCollapsed) === 'true';
    this.pinnedIds = this.readTabList(App.STORAGE_KEYS.pinnedTabs);
    this.recentIds = this.readTabList(App.STORAGE_KEYS.recentTabs);

    const savedTheme = App.readStorage(App.STORAGE_KEYS.theme);
    this.darkMode = savedTheme
      ? savedTheme === 'dark'
      : typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.applyTheme();

    // Priority: URL hash (shared link) > last used tab > default
    const initialTab = this.tabFromHash() ?? App.resolveAlias(App.readStorage(App.STORAGE_KEYS.activeTab) ?? '');
    this.activeTab = initialTab && this.isValidTab(initialTab) ? initialTab : App.DEFAULT_TAB;
    this.syncHash();

    AccessUtils.fetchIdentity().then(identity => {
      // ng serve has no Access in front: show a placeholder so the footer layout can be checked locally
      this.identity = identity ?? (isDevMode() ? App.DEV_IDENTITY : null);
      this.cdr.markForCheck();
    });

    // Restored tab may sit off-screen in the mobile horizontal menu
    afterNextRender(() => {
      document.querySelector('.tabs .tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  /** Sidebar shows only the part before @ (all users share @tdshop.io); the full address is in the tooltip */
  get accountName(): string {
    return this.identity?.email.split('@')[0] ?? '';
  }

  get allTabs() {
    return this.navGroups.flatMap(group => group.tabs);
  }

  /** Sidebar content: Pinned + Recent shortcuts on top, or plain filtered groups while searching. */
  get sidebarGroups(): NavGroup[] {
    if (this.searchText.trim()) return this.filteredGroups;

    const byId = (id: string) => this.allTabs.find(tab => tab.id === id);
    const pinned = this.pinnedIds.map(byId).filter(tab => tab !== undefined);
    const recent = this.recentIds
      .filter(id => !this.pinnedIds.includes(id))
      .map(byId)
      .filter(tab => tab !== undefined);

    return [
      ...(pinned.length ? [{ label: 'Pinned', tabs: pinned, shortcut: true }] : []),
      ...(this.showRecent && recent.length ? [{ label: 'Recent', tabs: recent, shortcut: true }] : []),
      ...this.navGroups,
    ];
  }

  get filteredGroups(): NavGroup[] {
    const keyword = this.searchText.trim().toLowerCase();
    if (!keyword) return this.navGroups;

    return this.navGroups
      .map(group => ({ ...group, tabs: group.tabs.filter(tab => tab.label.toLowerCase().includes(keyword)) }))
      .filter(group => group.tabs.length > 0);
  }

  openTab(tabId: string, event?: Event) {
    if (!this.isValidTab(tabId)) return;

    this.activeTab = tabId;
    App.writeStorage(App.STORAGE_KEYS.activeTab, tabId);
    this.recentIds = [tabId, ...this.recentIds.filter(id => id !== tabId)].slice(0, App.MAX_RECENT);
    App.writeStorage(App.STORAGE_KEYS.recentTabs, JSON.stringify(this.recentIds));
    this.syncHash();

    // On mobile the menu is a horizontal strip; keep the selected item visible
    (event?.currentTarget as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  onSearchEnter() {
    const firstMatch = this.filteredGroups[0]?.tabs[0];
    if (firstMatch) {
      this.openTab(firstMatch.id);
      this.clearSearch();
    }
  }

  clearSearch() {
    this.searchText = '';
    this.searchInput?.nativeElement.blur();
  }

  isPinned(tabId: string) {
    return this.pinnedIds.includes(tabId);
  }

  togglePin(tabId: string, event?: Event) {
    // The pin icon sits inside the menu link; don't navigate
    event?.preventDefault();
    event?.stopPropagation();

    this.pinnedIds = this.isPinned(tabId)
      ? this.pinnedIds.filter(id => id !== tabId)
      : [...this.pinnedIds, tabId];
    App.writeStorage(App.STORAGE_KEYS.pinnedTabs, JSON.stringify(this.pinnedIds));
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    App.writeStorage(App.STORAGE_KEYS.sidebarCollapsed, String(this.sidebarCollapsed));
  }

  toggleTheme() {
    const switchTheme = () => {
      this.darkMode = !this.darkMode;
      App.writeStorage(App.STORAGE_KEYS.theme, this.darkMode ? 'dark' : 'light');
      this.applyTheme();
      // Render the new toggle icon/label inside the same frame as the theme swap
      this.cdr.detectChanges();
    };

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      switchTheme();
      return;
    }

    // Cross-fade the whole page in one go so every element changes colour together
    const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
    if (doc.startViewTransition) {
      doc.startViewTransition(switchTheme);
      return;
    }

    // Fallback: temporarily transition colours on every element
    const root = document.documentElement;
    root.classList.add('theme-switching');
    switchTheme();
    setTimeout(() => root.classList.remove('theme-switching'), 350);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      if (this.triggerPrimaryAction()) event.preventDefault();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.sidebarCollapsed) this.toggleSidebar();
      // Wait for the input to render when the sidebar was collapsed
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  @HostListener('window:hashchange')
  onHashChange() {
    const tab = this.tabFromHash();
    if (!tab || !this.isValidTab(tab)) return;
    if (tab !== this.activeTab) this.openTab(tab);
    // Old id of a merged tool (e.g. #unicodeConverter) -> show the canonical hash
    else this.syncHash();
  }

  /**
   * Clicks the current tool's main button (marked with `data-primary-action`).
   * Tools with several actions (e.g. Check Product Tag) get the first one after the focused field.
   */
  private triggerPrimaryAction(): boolean {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('#content-area [data-primary-action]')
    ).filter(button => !button.disabled && button.offsetParent !== null);
    if (buttons.length === 0) return false;

    const focused = document.activeElement;
    const next = focused && focused !== document.body
      ? buttons.find(button => focused.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
      : undefined;

    (next ?? buttons[0]).click();
    return true;
  }

  private isValidTab(tabId: string) {
    return this.allTabs.some(tab => tab.id === tabId);
  }

  private tabFromHash(): string | null {
    if (typeof location === 'undefined') return null;
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    // A link to a retired tool also selects its tab inside the toolkit that replaced it
    const section = App.TAB_ALIASES[id]?.section;
    if (section) {
      App.writeStorage(section.key, section.value);
      // A toolkit that is already on screen switches tab right away (see TOOLKIT_SECTION_EVENT)
      window.dispatchEvent(new CustomEvent(TOOLKIT_SECTION_EVENT, { detail: section }));
    }
    return App.resolveAlias(id) || null;
  }

  private syncHash() {
    if (typeof history === 'undefined') return;
    // replaceState avoids piling up history entries on every tab switch
    history.replaceState(null, '', `#${this.activeTab}`);
  }

  private applyTheme() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-bs-theme', this.darkMode ? 'dark' : 'light');
    document.documentElement.toggleAttribute('data-mac', this.isMac);
  }

  private readTabList(key: string): string[] {
    try {
      const parsed = JSON.parse(App.readStorage(key) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      const ids = parsed.filter((id): id is string => typeof id === 'string').map(App.resolveAlias);
      return [...new Set(ids)].filter(id => this.isValidTab(id));
    } catch {
      return [];
    }
  }

  private static resolveAlias(id: string): string {
    return App.TAB_ALIASES[id]?.tab ?? id;
  }

  private static readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private static writeStorage(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode) — preference just won't persist
    }
  }
}
