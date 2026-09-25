import { Component, HostListener } from '@angular/core';
import { Calculator } from '../calculator/calculator';
import { VatCalculator } from '../vat-calculator/vat-calculator';

type Section = 'calc' | 'vat';

/** Calculator (Numi-style notepad) and VAT Calculator as tabs. Panes stay mounted so input survives tab switches. */
@Component({
  selector: 'app-calc-toolkit',
  imports: [Calculator, VatCalculator],
  templateUrl: './calc-toolkit.html',
  styleUrl: './calc-toolkit.scss',
})
export class CalcToolkit {
  /** Also written by App when an old #vatCalculator link is opened */
  static readonly SECTION_KEY = 'calcToolkit.section';

  readonly sections: { id: Section; label: string; icon: string }[] = [
    { id: 'calc', label: 'Calculator', icon: 'fa-calculator' },
    { id: 'vat', label: 'VAT', icon: 'fa-percent' },
  ];

  section: Section = CalcToolkit.readSection();

  /** Old tool links (e.g. #vatCalculator) opened while this toolkit is already showing */
  @HostListener('window:toolkit-section', ['$event'])
  onSectionRequest(event: Event) {
    const { key, value } = (event as CustomEvent<{ key: string; value: string }>).detail ?? {};
    if (key === CalcToolkit.SECTION_KEY && (value === 'calc' || value === 'vat')) this.setSection(value);
  }

  setSection(section: Section) {
    this.section = section;
    try {
      localStorage.setItem(CalcToolkit.SECTION_KEY, section);
    } catch {
      // storage unavailable — the tab just won't be remembered
    }
  }

  private static readSection(): Section {
    try {
      return localStorage.getItem(CalcToolkit.SECTION_KEY) === 'vat' ? 'vat' : 'calc';
    } catch {
      return 'calc';
    }
  }
}
