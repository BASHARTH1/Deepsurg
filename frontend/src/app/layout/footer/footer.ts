import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ds-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="ft">
      <div class="ds-container ft__inner">
        <div class="ft__brand">
          <a class="ft__logo" routerLink="/" aria-label="DeepSurg — home"></a>
          <p>
            Clinical-grade AI for the operating room. Built with surgeons, deployed inside the
            hospital, evaluated like a medical device.
          </p>
        </div>

        <nav class="ft__col" aria-label="Platform">
          <h4>Platform</h4>
          <a routerLink="/" fragment="platform">Capabilities</a>
          <a routerLink="/" fragment="team">Leadership</a>
          <a routerLink="/" fragment="partners">Partners</a>
        </nav>

        <nav class="ft__col" aria-label="Company">
          <h4>Company</h4>
          <a routerLink="/" fragment="faq">FAQ</a>
          <a routerLink="/" fragment="contact">Contact</a>
        </nav>

        <div class="ft__col">
          <h4>Get in touch</h4>
          <a href="mailto:omar&#64;deepsurg.ai">omar&#64;deepsurg.ai</a>
        </div>
      </div>

      <div class="ds-container ft__base">
        <span>© {{ year }} DeepSurg. All rights reserved.</span>
        <span class="ft__note">
          DeepSurg software is decision support. It does not replace clinical judgement.
        </span>
      </div>
    </footer>
  `,
  styles: [
    `
      .ft {
        border-top: 1px solid var(--ds-line);
        background: linear-gradient(180deg, #ffffff 0%, var(--ds-blue-50) 100%);
        padding-top: 62px;
      }

      .ft__inner {
        display: grid;
        grid-template-columns: 1.6fr repeat(3, 1fr);
        gap: 36px;
        padding-bottom: 42px;
      }

      .ft__logo {
        display: block;
        width: 152px;
        height: 38px;
        background: var(--ds-brand);
        -webkit-mask: url('/logo-deepsurg.webp') no-repeat left center / contain;
        mask: url('/logo-deepsurg.webp') no-repeat left center / contain;
      }

      .ft__brand p {
        margin-top: 12px;
        max-width: 38ch;
        font-size: 0.92rem;
      }

      .ft__col {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .ft__col h4 {
        margin: 0 0 4px;
        font-size: 0.76rem;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        color: var(--ds-slate-light);
      }

      .ft__col a {
        color: var(--ds-slate);
        font-size: 0.92rem;
      }

      .ft__col a:hover {
        color: var(--ds-blue-700);
      }

      .ft__base {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 24px;
        justify-content: space-between;
        padding-block: 20px;
        border-top: 1px solid var(--ds-line);
        font-size: 0.82rem;
        color: var(--ds-slate-light);
      }

      .ft__note {
        /* Stays on one line wherever it fits; the flex row drops it below the
           copyright before the sentence itself has to break. */
        max-width: 100%;
      }

      @media (max-width: 820px) {
        .ft__inner {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 520px) {
        .ft__inner {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Footer {
  readonly year = new Date().getFullYear();
}
