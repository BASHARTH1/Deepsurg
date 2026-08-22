import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Product } from '../../core/products';

/** The line-art mark for a product, drawn in the current text colour. */
@Component({
  selector: 'ds-product-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (icon()) {
      @case ('vision') {
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2.5 16S7 8.5 16 8.5 29.5 16 29.5 16 25 23.5 16 23.5 2.5 16 2.5 16Z" />
          <circle cx="16" cy="16" r="4" />
          <path d="M16 3v2.5M16 26.5V29M5 6l1.8 1.8M25.2 24.2 27 26" />
        </svg>
      }
      @case ('skill') {
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 27h24" />
          <path d="M8 27v-7M15 27V13M22 27V17" />
          <path d="m6 11 6-5 5 4 8-7" />
          <path d="M22 3h3v3" />
        </svg>
      }
    }
  `,
  styles: [
    `
      :host {
        display: inline-grid;
        place-items: center;
      }

      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class ProductIcon {
  readonly icon = input.required<Product['icon']>();
}
