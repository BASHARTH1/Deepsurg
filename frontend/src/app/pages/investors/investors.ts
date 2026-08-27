import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OFFICES, PARTNERS, SITES, TEAM } from '../../core/company';
import { PRODUCTS } from '../../core/products';
import { NerveBackground } from '../../shared/nerve-background/nerve-background';
import { ProductIcon } from '../../shared/product-icon/product-icon';

@Component({
  selector: 'ds-investors',
  standalone: true,
  imports: [NerveBackground, ProductIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investors.html',
  styleUrl: './investors.scss',
})
export class Investors {
  readonly products = PRODUCTS;
  readonly offices = OFFICES;
  readonly sites = SITES;
  readonly partners = PARTNERS;
  readonly team = TEAM;

  /**
   * Only things the rest of the site already states. Anything about funding,
   * revenue or clinical results has to come from the company, not from here.
   */
  readonly facts = [
    { label: 'Products', value: String(PRODUCTS.length), caption: 'Primo AI and Scala AI' },
    { label: 'Offices', value: String(OFFICES.length), caption: 'Cambridge and Utrecht' },
    {
      label: 'Partnership sites',
      value: String(SITES.length),
      caption: 'Countries with projects under way',
    },
    {
      label: 'Clinical & academic partners',
      value: String(PARTNERS.length),
      caption: 'Hospitals and universities',
    },
  ];
}
