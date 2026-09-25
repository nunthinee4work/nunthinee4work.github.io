import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('app.activeTab');
    localStorage.removeItem('app.sidebarCollapsed');
    localStorage.removeItem('app.theme');
    localStorage.removeItem('app.pinnedTabs');
    localStorage.removeItem('app.recentTabs');
    localStorage.removeItem('textToolkit.section');
    localStorage.removeItem('timeToolkit.section');
    history.replaceState(null, '', location.pathname);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideToastr()]
    }).compileComponents();
  });

  afterEach(() => {
    history.replaceState(null, '', location.pathname);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand and sidebar menu', () => {
    // Dispatch Order tabs rely on the global Bootstrap bundle, not loaded in Karma
    localStorage.setItem('app.activeTab', 'listTools');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-text')?.textContent).toContain('Galaxy Utils');
    expect(compiled.querySelectorAll('.tabs .tab').length).toBe(fixture.componentInstance.allTabs.length);
  });

  it('should default to the first tool and write it to the URL hash', () => {
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('dispatchOrder');
    expect(location.hash).toBe('#dispatchOrder');
  });

  it('should restore the last used tab from localStorage', () => {
    localStorage.setItem('app.activeTab', 'listTools');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('listTools');
  });

  it('should prefer the URL hash over the saved tab', () => {
    localStorage.setItem('app.activeTab', 'listTools');
    history.replaceState(null, '', '#barcodeGenerator');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('barcodeGenerator');
  });

  it('should ignore an unknown hash', () => {
    history.replaceState(null, '', '#doesNotExist');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('dispatchOrder');
  });

  it('should persist the tab when switching', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.openTab('timeConverter');
    expect(localStorage.getItem('app.activeTab')).toBe('timeConverter');
    expect(location.hash).toBe('#timeConverter');
  });

  it('should filter menu by search text and open the first match on enter', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.searchText = 'barcode';
    const labels = app.filteredGroups.flatMap(g => g.tabs.map(t => t.label));
    expect(labels).toEqual(['Barcode Generator']);

    app.onSearchEnter();
    expect(app.activeTab).toBe('barcodeGenerator');
    expect(app.searchText).toBe('');
  });

  it('should persist sidebar collapse and theme preferences', () => {
    // toggleTheme renders the view; avoid Dispatch Order which needs the global Bootstrap bundle
    localStorage.setItem('app.activeTab', 'listTools');
    const app = TestBed.createComponent(App).componentInstance;
    const wasDark = app.darkMode;

    // Run the view-transition callback synchronously so the assertions below see the new theme
    const doc = document as any;
    if (doc.startViewTransition) {
      spyOn(doc, 'startViewTransition').and.callFake((callback: () => void) => callback());
    }

    app.toggleSidebar();
    app.toggleTheme();

    expect(localStorage.getItem('app.sidebarCollapsed')).toBe('true');
    expect(localStorage.getItem('app.theme')).toBe(wasDark ? 'light' : 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe(wasDark ? 'light' : 'dark');
  });

  it('should show pinned tools on top and persist them', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.togglePin('listTools');

    expect(app.sidebarGroups[0].label).toBe('Pinned');
    expect(app.sidebarGroups[0].tabs.map(t => t.id)).toEqual(['listTools']);
    expect(JSON.parse(localStorage.getItem('app.pinnedTabs')!)).toEqual(['listTools']);

    app.togglePin('listTools');
    expect(app.sidebarGroups.some(g => g.label === 'Pinned')).toBeFalse();
  });

  it('should keep the 3 most recent tools, newest first, without pinned ones', () => {
    const app = TestBed.createComponent(App).componentInstance;
    ['listTools', 'timeConverter', 'productTag', 'barcodeGenerator', 'timeConverter']
      .forEach(id => app.openTab(id));

    expect(app.recentIds).toEqual(['timeConverter', 'barcodeGenerator', 'productTag']);

    // Can be hidden without losing the history
    app.showRecent = false;
    expect(app.sidebarGroups.some(g => g.label === 'Recent')).toBeFalse();
    app.showRecent = true;

    app.togglePin('barcodeGenerator');
    const recent = app.sidebarGroups.find(g => g.label === 'Recent')!;
    expect(recent.tabs.map(t => t.id)).toEqual(['timeConverter', 'productTag']);
  });

  it('should drop unknown ids from saved pinned tools', () => {
    localStorage.setItem('app.pinnedTabs', JSON.stringify(['listTools', 'removedTool']));
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.pinnedIds).toEqual(['listTools']);
  });

  it('should hide Pinned/Recent sections while searching', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.togglePin('listTools');
    app.searchText = 'list';
    expect(app.sidebarGroups.map(g => g.label)).toEqual(['Utilities']);
  });

  describe('Ctrl/Cmd + Enter', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.id = 'content-area';
      container.innerHTML = `
        <input id="first-field">
        <button id="first" data-primary-action>First</button>
        <input id="second-field">
        <button id="second" data-primary-action>Second</button>`;
      document.body.appendChild(container);
    });

    afterEach(() => container.remove());

    const press = (app: App, ctrlKey = true) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey });
      app.onKeydown(event);
      return event;
    };

    it('should click the first primary action when nothing is focused', () => {
      const app = TestBed.createComponent(App).componentInstance;
      const clicked = jasmine.createSpy('first');
      container.querySelector('#first')!.addEventListener('click', clicked);

      (document.activeElement as HTMLElement | null)?.blur();
      press(app);
      expect(clicked).toHaveBeenCalled();
    });

    it('should click the primary action that follows the focused field', () => {
      const app = TestBed.createComponent(App).componentInstance;
      const first = jasmine.createSpy('first');
      const second = jasmine.createSpy('second');
      container.querySelector('#first')!.addEventListener('click', first);
      container.querySelector('#second')!.addEventListener('click', second);

      (container.querySelector('#second-field') as HTMLInputElement).focus();
      press(app);
      expect(second).toHaveBeenCalled();
      expect(first).not.toHaveBeenCalled();
    });

    it('should ignore plain Enter', () => {
      const app = TestBed.createComponent(App).componentInstance;
      const clicked = jasmine.createSpy('first');
      container.querySelector('#first')!.addEventListener('click', clicked);

      press(app, false);
      expect(clicked).not.toHaveBeenCalled();
    });
  });

  it('should redirect retired tabs to List Formatter (links and saved pins)', () => {
    history.replaceState(null, '', '#arrayFormatter');
    localStorage.setItem('app.pinnedTabs', JSON.stringify(['thaiLocaleCompare', 'arrayFormatter']));
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('listTools');
    expect(app.pinnedIds).toEqual(['listTools']);
  });

  it('should send the old Cron Schedule link to the Cron tab of Time Toolkit', () => {
    history.replaceState(null, '', '#cronSchedule');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('timeConverter');
    expect(localStorage.getItem('timeToolkit.section')).toBe('cron');
  });

  it('should open the matching Text Toolkit tab from an old tool link', () => {
    history.replaceState(null, '', '#wordCounter');
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.activeTab).toBe('textToolkit');
    expect(localStorage.getItem('textToolkit.section')).toBe('count');
  });

  it('should ask an open toolkit to switch tab when an old link is followed', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const events: CustomEvent[] = [];
    const listener = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('toolkit-section', listener);

    history.replaceState(null, '', '#unicodeConverter');
    app.onHashChange();
    window.removeEventListener('toolkit-section', listener);

    expect(app.activeTab).toBe('textToolkit');
    expect(events[0].detail).toEqual({ key: 'textToolkit.section', value: 'unicode' });
    expect(location.hash).toBe('#textToolkit');
  });
  it('should show the Access user and a logout link when signed in', () => {
    localStorage.setItem('app.activeTab', 'listTools');
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.identity = { email: 'someone@tdshop.io' };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const email = compiled.querySelector('.account-email');
    expect(email?.textContent?.trim()).toBe('someone');
    expect(email?.getAttribute('title')).toBe('someone@tdshop.io');
    expect(compiled.querySelector('.logout-btn')?.getAttribute('href')).toBe('/cdn-cgi/access/logout');
  });

  it('should show a dummy account in dev mode when not behind Access', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));
    localStorage.setItem('app.activeTab', 'listTools');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.account-email')?.textContent?.trim()).toBe('dummy');
  });
});
