import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCTS } from '../../core/products';
import { ProductIcon } from '../../shared/product-icon/product-icon';

@Component({
  selector: 'ds-products',
  standalone: true,
  imports: [ProductIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  readonly products = PRODUCTS;
}
