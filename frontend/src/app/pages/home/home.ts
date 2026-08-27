import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Blog, Post } from '../../core/blog';
import { PRODUCTS } from '../../core/products';
import { Globe, GlobeMarker, GlobeRegion } from '../../shared/globe/globe';
import { NerveBackground } from '../../shared/nerve-background/nerve-background';
import { ProductIcon } from '../../shared/product-icon/product-icon';

@Component({
  selector: 'ds-home',
  standalone: true,
  imports: [DatePipe, Globe, NerveBackground, ProductIcon, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly api = inject(Api);
  private readonly blog = inject(Blog);
  private readonly fb = inject(FormBuilder);

  /** The three most recent posts; the section hides itself when empty. */
  readonly latest = signal<Post[]>([]);

  readonly products = PRODUCTS;

  readonly team = [
    {
      name: 'Omar Jibrel',
      role: 'Chief Executive Officer & Co-Founder',
      photo: 'team/omar-jibrel.webp',
      initials: 'OJ',
    },
    {
      name: 'Berke Sengun',
      role: 'Chief Medical Officer & Co-Founder',
      photo: 'team/berke-sengun.webp',
      initials: 'BS',
    },
    {
      name: 'Zechang Xue',
      role: 'Data Science Team Lead',
      photo: 'team/zechang-xue.webp',
      initials: 'ZX',
    },
  ];

  readonly creed = [
    { lead: 'Technology for those who', accent: 'care' },
    { lead: 'Innovation for those who', accent: 'save' },
    { lead: 'Results for those who', accent: 'matter' },
  ];

  readonly pillars = [
    { icon: 'realtime', title: 'Real-time insights across modalities' },
    { icon: 'learning', title: 'Driven by deep learning' },
    { icon: 'surgeons', title: 'Designed for those who operate' },
  ];

  readonly partners = [
    { name: 'Istanbul University — Faculty of Medicine', logo: 'partners/istanbul-faculty-of-medicine.webp' },
    { name: 'İstanbul Üniversitesi', logo: 'partners/istanbul-universitesi.webp' },
    { name: 'Clínic Barcelona', logo: 'partners/clinic-barcelona.webp' },
    { name: 'Universitat Autònoma de Barcelona', logo: 'partners/universitat-autonoma-barcelona.webp' },
    { name: 'Universitat de Barcelona', logo: 'partners/universitat-barcelona.webp' },
  ];

  /** Pinned on the globe; lat/lon are the office cities themselves. */
  readonly offices: ReadonlyArray<GlobeMarker & { country: string; city: string; address: string }> = [
    {
      label: 'United Kingdom',
      country: 'United Kingdom',
      city: 'Cambridge',
      address: '184 Cambridge Science Park, Milton Road, Cambridge, CB4 0GA, UK',
      lat: 52.21,
      lon: 0.09,
      side: 'left',
      region: 'GBR',
    },
    {
      label: 'Netherlands',
      country: 'Netherlands',
      city: 'Utrecht',
      address: 'Vinkenburgstraat 2A, 3512 AB Utrecht, The Netherlands',
      lat: 52.09,
      lon: 5.11,
      side: 'right',
      region: 'NLD',
    },
  ];

  /** Tinted on the globe, without a pin — no single address to point at. */
  readonly sites: readonly GlobeRegion[] = [
    { code: 'TUR', label: 'Türkiye' },
    { code: 'SAU', label: 'Saudi Arabia' },
    { code: 'ESP', label: 'Spain' },
    { code: 'DNK', label: 'Denmark' },
    { code: 'CHE', label: 'Switzerland' },
    { code: 'HUN', label: 'Hungary' },
    { code: 'CAN', label: 'Canada' },
  ];

  readonly faqs = [
    {
      q: 'What is DeepSurg’s surgical assistant software?',
      a: 'Our software uses advanced artificial intelligence to act as a co-pilot in surgical procedures, providing real-time guidance, predictive analysis, and personalized feedback to improve the safety and effectiveness of surgeries.',
    },
    {
      q: 'Can this system replace surgeons?',
      a: 'No. Our system is a collaborative tool designed to enhance surgeons’ skills, not to replace them. The surgeon maintains full control throughout all procedures.',
    },
    {
      q: 'What are the main benefits of using our AI surgical assistant?',
      a: 'Reduction of human errors, patient-specific data-driven insights, continuous learning based on thousands of procedures, and improved cost and time efficiency.',
    },
    {
      q: 'How does the software ensure patient data security and privacy?',
      a: 'We strictly comply with regulations such as HIPAA and GDPR, using anonymized data and secure storage systems to protect patient information.',
    },
    {
      q: 'Which regions can use the system?',
      a: 'The DeepSurg system is designed to serve hospitals worldwide. We are actively expanding our global presence and collaborating with international healthcare institutions to integrate our technology into their surgical processes. Our goal is to provide all regions with the tools necessary to perform safer and more effective surgical procedures, improving patient outcomes globally.',
    },
    {
      q: 'Is special training required to operate the system?',
      a: 'Yes, we offer comprehensive training programs for surgeons and surgical teams to ensure effective use of our system.',
    },
    {
      q: 'How can I schedule a software demonstration?',
      a: 'Contact us through our website’s contact form to schedule a demonstration and see how our software can transform surgical procedures at your institution.',
    },
    {
      q: 'How does the AI assistance system impact patient recovery time after surgery?',
      a: 'Our system is designed to increase the precision of surgical interventions, which can significantly reduce patient recovery time by minimizing surgical trauma and improving post-operative outcomes. Predictive analysis and real-time suggestions help prevent complications and enable the adoption of the best surgical practices tailored to each case.',
    },
  ];

  readonly interests = [
    'A live demo',
    'Clinical evaluation / research partnership',
    'Integration with our theatre stack',
    'Careers at DeepSurg',
    'Something else',
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    organisation: ['', [Validators.required]],
    interest: [this.interests[0], [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  readonly sending = signal(false);
  readonly sent = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.blog
      .published(3)
      .then((posts) => this.latest.set(posts))
      .catch(() => this.latest.set([]));
  }

  invalid(control: keyof typeof this.form.controls): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  submit(): void {
    this.error.set(null);
    this.sent.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.api.submitContact(this.form.getRawValue()).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(
          'Thank you — a member of the DeepSurg team will reply within two working days.',
        );
        this.form.reset({ interest: this.interests[0] });
      },
      error: () => {
        this.sending.set(false);
        this.error.set('We could not send your message. Please email omar@deepsurg.ai instead.');
      },
    });
  }
}
