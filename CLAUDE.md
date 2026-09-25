# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # ng serve, dev server at http://localhost:4200/
npm run build          # ng build (production config by default)
npm run watch          # ng build --watch --configuration development
npm test               # ng test (Karma + Jasmine)
```

Run a single test file: `ng test --include='**/barcode-generator.spec.ts'`

Specs that render `DispatchOrder`/`TDDispatchOrder` need `provideToastr()` and a stub for the global `bootstrap` JS (loaded from a CDN in `index.html`, absent in Karma) — see their specs. The shell specs (`app.spec.ts`) switch to a lightweight tab before rendering for the same reason. Every TestBed spec needs `provideZonelessChangeDetection()` (the app has no Zone.js — without it: `NG0908`), plus `provideToastr()` when the component injects `ToastrService`.

No lint script is configured (no ESLint config present).

Deploy: **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`) — every push to `main` runs the tests, builds with `npx ng build --base-href=/` and publishes `dist/cjx-utils/browser` to https://nunthinee4work.github.io/. `public/robots.txt` (disallow all, plus named AI crawlers) is copied into the output and `index.html` carries a noindex / noai robots meta (`public/_headers` is a Cloudflare Pages file; GitHub Pages ignores it). The site and this repo are public: keep internal host names / real data out of the bundle (curl uses `{{cjx-api}}`-style placeholders).

`AccessUtils` (`utils/access.utils.ts`) shows the signed-in user + Log out in the sidebar footer when the site runs behind Cloudflare Access (`/cdn-cgi/access/get-identity`); elsewhere the row is hidden (dev mode shows `dummy@mail.com`). `ChunkReloadErrorHandler` (registered in `main.ts`) reloads the page once per 30 s when a lazy tool chunk fails to load (`@defer` NG0750).

## Architecture

This is a single-page Angular 20 app (standalone components, zoneless change detection via `provideZonelessChangeDetection`) that bundles a grab-bag of internal tools used by TD Shop / CJX operations staff — barcode generation, dispatch order builders, stock count request builders, locale/unicode utilities, etc. There is no backend in this repo; each tool is a self-contained client-side form/generator.

**No routing.** `src/app/app.routes.ts` is empty. Navigation is a left sidebar driven by [app.ts](src/app/app.ts): `App.navGroups` is a list of `{label, tabs: [{id, label, icon}]}` groups (Order / Stock & Product / Utilities; `icon` is a Font Awesome solid class like `fa-barcode`). `activeTab` holds the selection, and [app.html](src/app/app.html) renders the matching component inside an `@switch (activeTab)`, each `@case` wrapped in `@defer (on immediate)` so every tool is its own lazy chunk. To add a new tool:
1. Generate/add the standalone component under `src/app/components/<name>/`.
2. Import it and add it to the `imports` array in [app.ts](src/app/app.ts) — reference it only from the template's `@defer` block, or it stops being lazy-loaded.
3. Add a `{id, label, icon}` entry to the right group in `navGroups`.
4. Add an `@case ('<id>')` with the same `@defer` / `@loading` wrapper in [app.html](src/app/app.html).
5. Put `data-primary-action` on the tool's main button so Ctrl/⌘+Enter triggers it (with several, the first one after the focused field wins).

Commented-out entries in `navGroups` are tools that are built but intentionally hidden from the UI — check before deleting a component that looks "unused". When a tool is merged into another, keep its old id working by adding it to `App.TAB_ALIASES` (old links, saved last tab and pins are redirected) — e.g. `arrayFormatter` / `thaiLocaleCompare` → `listTools`. An alias can also carry a `section` (localStorage key + value) so the link opens the right in-page tab of the toolkit that absorbed the tool, e.g. `cronSchedule` → Time Toolkit's Cron tab, `jsonViewer` / `textCompare` / `wordCounter` / `unicodeConverter` → Text Toolkit.

**Shell behaviour** (all in `App`, persisted in `localStorage` under `app.*` keys): the tab id is mirrored to the URL hash (`#barcodeGenerator`) so links open a specific tool — the hash wins over the last-used tab (`app.activeTab`), which wins over the default. Also persisted: pinned tools (`app.pinnedTabs`), the 3 most recent (`app.recentTabs`, shown as a Recent section; `App.showRecent = false` hides it without losing history), sidebar collapsed state, and theme. Ctrl/⌘+K focuses the sidebar search.

**Text Toolkit** (tab id `textToolkit`, `components/text-toolkit/`): hosts JSON Viewer / Text Compare / Word Counter / Unicode Converter as in-page tabs (each with `[embedded]="true"` to hide its own heading). Panes are toggled with `[hidden]`, not `@switch`, so pasted text survives tab switches; last tab in `localStorage` `textToolkit.section`.

**JSON Viewer** (`components/json-viewer/`): editor (reuses `app-json-editor`) + grid, similar to jsongrid.com. `JsonGridNode` renders recursively (objects as key/value tables, arrays of objects as one table with a column per key, CSV export per table); `JsonGridContext` (provided per viewer) holds selection, search term and expand/collapse-all. Clicking a grid cell selects the matching text in the editor using offsets from `JsonUtils.parseWithLocations` (GridSync). Input is not persisted — pasted JSON may contain real order data.

**Text Compare** (tab `compare` in Text Toolkit, `components/text-compare/`): diffchecker-style line diff with word-level highlights, split/unified views, folding of unchanged runs, and Format JSON per side or both (`JsonUtils.format`, optional key sorting so key order isn't reported as a change). The diff is our own Myers implementation in `utils/diff.utils.ts` (`DiffUtils.compareText`), no npm diff library. Inputs are not persisted.

**Word Counter** (`components/word-counter/`): wordcounter.net-style live stats, keyword density and a character-limit bar. Counting lives in `utils/text-stats.utils.ts` and uses `Intl.Segmenter` (word / grapheme / sentence) so Thai — written without spaces — is counted correctly; characters are grapheme clusters, bytes are UTF-8.

**Time Toolkit** (tab id `timeConverter`, code in `components/epoch-converter/`): epochconverter.com-style tool — live epoch clock, timestamp (s/ms/µs/ns auto-detected, or a MongoDB ObjectId) → dates in UTC / Bangkok / Thai BE, date → epoch, start/end of day/month/year, batch convert, hours between two clock times (overnight + break aware), and a converter.net-style time unit converter. Split into in-page tabs Epoch & Date / Duration / Cron Schedule (last tab remembered in `localStorage` `timeToolkit.section`). Logic in `utils/epoch.utils.ts`; Bangkok is a fixed +07:00 (no DST).

**Cron Schedule** (`components/cron-schedule/`, shown as a tab inside Time Toolkit with `[embedded]="true"`; old `#cronSchedule` links redirect): crontab.guru-style editor — English description, next 5 runs in Bangkok/UTC/local, per-field legend highlighted at the cursor. `utils/cron.utils.ts` parses 5-field cron, 6-field Spring `@Scheduled` (seconds first), names, `?` and @macros; day-of-month/day-of-week use Vixie OR semantics when both are restricted.

**List Formatter** (tab id `listTools`, `components/list-tools/`): replaces Array Formatter + Thai Locale Compare (their components remain, hidden). Tabs: **Format** (live split → trim / dedupe / Thai-aware sort (English A–Z first, then ก–ฮ, optional numeric order) → quote → join) and **Count Duplicates** (somacon.com-style per-line counts, duplicates-only filter, Text/CSV/TAB output, in-memory Restore input). Both share one input; logic in `utils/list.utils.ts`.

**Styling / theming**: all global styles live in [styles.scss](src/styles.scss), loaded *after* Bootstrap/ng-select/toastr in `angular.json` so it can override them. Colours, radii and shadows are CSS custom properties on `:root` (`--c-primary`, `--c-surface`, `--c-border`, …) with a dark set under `[data-theme="dark"]`; use these tokens instead of hard-coded colours so dark mode keeps working. Bootstrap buttons are themed through their `--bs-btn-*` variables. Theme switches cross-fade via the View Transitions API (`App.toggleTheme`). Layout is responsive: sidebar narrows under 1100px and becomes a horizontal top strip under 768px.

**Component structure**: everything under `src/app/components/` is a standalone, routed-by-tab tool component (`.ts` + `.html` + `.scss` + `.spec.ts`). `src/app/shared/` holds small reusable UI pieces used across tools: `copy-button`, `download-button` (saves text as `<name>-<timestamp>.<ext>`), `code-box` (copy + optional download via `fileName`), `json-editor` (ControlValueAccessor textarea with line numbers, live JSON validation, error-line highlight, Go to line and Format — used for the Delivery Order inputs; `[list]="true"` accepts `{..}`, `{..},{..}`, `[{..}]` and shell helpers — legacy shell (`ObjectId`, `ISODate`, `NumberLong`…) and mongosh / Compass (`Long`, `Int32`, `Double`, `Decimal128`, `Timestamp`, `BinData`) — via `JsonUtils.parseObjectList` / `normalizeMongoShell`), `random-button`. `src/app/utils/` has static helper classes: `DateUtils` (date formatting), `FileUtils` (browser download), `JsonUtils` (JSON validation that locates the error itself since newer V8 messages omit positions; `parseObjectList` / `normalizeMongoShell` / `unwrapExtendedJson` for pasted MongoDB documents).

**ng-select `[items]` must be a stable array** (a property refreshed on change), never a getter that builds a new array: with zoneless change detection, hovering an option re-renders, ng-select re-creates its options and the click is lost.

**Forms**: components use Angular Reactive Forms (`FormBuilder`, `FormGroup`/`FormArray`, `Validators`) rather than template-driven forms. `@ng-select/ng-select` is the standard dropdown/select widget across the app (not the native `<select>`).

**State/persistence**: some tools persist user input to `localStorage` directly in the component (e.g. `barcode-generator.ts` saves `barcodeInput`/`barcodes` on every value change and restores them in `ngOnInit`) — there is no shared state service or store.

**Notable per-tool libraries**: `jsbarcode` (barcode-generator), `qrcode` (QR generation), `xlsx` (spreadsheet import/export in dispatch-order tools), `ngx-toastr` (user-facing notifications), `@angular/cdk/clipboard` (the shared copy-button).

**Dispatch Order tote ids** (CJX + TD): suffix defaults to the current date-time (yyyyMMddHHmm, Bangkok, taken when defaults are applied) and running number to 1 unless “กำหนด Subfix Tote Code และเลขเริ่มต้นเอง” is ticked (the toggle is hidden in mode `SPECIFY_TOTE`, labelled **Auto – My Prefix**, which always uses the defaults). Mode labels: Manual (`CUSTOM_TOTE`), One Tote (`SINGLE_TOTE`), Auto – Random Prefix (`RANDOM_TOTE`), Auto – My Prefix (`SPECIFY_TOTE`); generated running numbers continue across DOs and use 2 digits (01, 02 …), widening for the whole batch only when needed (001 … 120) — `runningNumberWidth`; and a tote id used by two different DOs (except `PL`) is highlighted red as a warning — it does not block Export CSV (`duplicateToteIds`).

**Larger components** like `dispatch-order.ts` (900+ lines) contain substantial form-building and data-transformation logic inline in the component class — there's no separate service layer for business logic in this codebase.
