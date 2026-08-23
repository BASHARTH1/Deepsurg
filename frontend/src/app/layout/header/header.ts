import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavItem {
  label: string;
  /** Route to visit. Defaults to the home page. */
  path?: string;
  /** Section to scroll to once there. */
  fragment?: string;
}

@Component({
  selector: 'ds-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="hd" [class.hd--stuck]="scrolled()">
      <div class="ds-container hd__inner">
        <a class="brand" routerLink="/" (click)="close()" aria-label="DeepSurg — home">
          <span class="brand__logo"></span>
        </a>

        <nav class="hd__nav" [class.hd__nav--open]="open()" aria-label="Primary">
          @for (item of nav; track item.label) {
            <a [routerLink]="item.path ?? '/'" [fragment]="item.fragment" (click)="close()">
              {{ item.label }}
            </a>
          }
          <a class="ds-btn ds-btn--primary hd__cta" routerLink="/" fragment="contact" (click)="close()">
            Request a demo
          </a>
        </nav>

        <button
          class="hd__burger"
          type="button"
          [attr.aria-expanded]="open()"
          aria-label="Toggle navigation"
          (click)="open.set(!open())"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        position: sticky;
        top: 0;
        z-index: 40;
      }

      /* Transparent at rest so the hero shows through; frosts once you scroll,
         where the nav would otherwise sit on top of real content. */
      .hd {
        background: transparent;
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease,
          backdrop-filter 0.2s ease;
      }

      .hd--stuck {
        border-bottom-color: var(--ds-line);
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: saturate(150%) blur(14px);
        box-shadow: 0 8px 30px rgba(26, 24, 190, 0.07);
      }

      .hd__inner {
        height: var(--ds-header-h);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
      }

      /* The supplied logo is white on transparent, so it is used as a mask and
         painted in the brand blue — one token retints it everywhere. */
      .brand__logo {
        display: block;
        width: 142px;
        height: 36px;
        background: var(--ds-brand);
        -webkit-mask: url('/logo-deepsurg.webp') no-repeat left center / contain;
        mask: url('/logo-deepsurg.webp') no-repeat left center / contain;
        transition: opacity 0.18s ease;
      }

      .brand:hover .brand__logo {
        opacity: 0.78;
      }

      @media (max-width: 420px) {
        .brand__logo {
          width: 120px;
          height: 30px;
        }
      }

      .hd__nav {
        display: flex;
        align-items: center;
        gap: 30px;
      }

      .hd__nav a {
        color: var(--ds-slate);
        font-size: 0.93rem;
        font-weight: 500;
        position: relative;
      }

      .hd__nav a:not(.hd__cta)::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -6px;
        width: 0;
        height: 2px;
        border-radius: 2px;
        background: var(--ds-gradient);
        transition: width 0.22s ease;
      }

      .hd__nav a:not(.hd__cta):hover {
        color: var(--ds-ink);
      }

      .hd__nav a:not(.hd__cta):hover::after {
        width: 100%;
      }

      /* Outranks the .hd__nav a colour above, which would otherwise grey it out. */
      .hd__nav a.hd__cta {
        padding: 10px 20px;
        font-size: 0.88rem;
        color: #fff;
      }

      .hd__burger {
        display: none;
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        width: 42px;
        height: 42px;
        padding: 0 9px;
        border: 1px solid var(--ds-line);
        border-radius: 12px;
        background: #fff;
        cursor: pointer;
      }

      .hd__burger span {
        height: 2px;
        border-radius: 2px;
        background: var(--ds-ink);
      }

      @media (max-width: 900px) {
        .hd__burger {
          display: flex;
        }

        .hd__nav {
          position: absolute;
          top: var(--ds-header-h);
          left: 0;
          right: 0;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
          padding: 18px 24px 26px;
          background: #fff;
          border-bottom: 1px solid var(--ds-line);
          box-shadow: var(--ds-shadow);
          display: none;
        }

        .hd__nav--open {
          display: flex;
        }

        .hd__nav a {
          padding: 11px 4px;
          font-size: 1rem;
        }

        .hd__cta {
          margin-top: 10px;
          justify-content: center;
        }
      }
    `,
  ],
})
export class Header {
  readonly nav: NavItem[] = [
    { label: 'Products', path: '/products' },
    { label: 'Blog', path: '/blog' },
    { label: 'Platform', fragment: 'platform' },
    { label: 'Leadership', fragment: 'team' },
    { label: 'Partners', fragment: 'partners' },
    { label: 'FAQ', fragment: 'faq' },
  ];

  readonly open = signal(false);
  readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  close(): void {
    this.open.set(false);
  }
}
