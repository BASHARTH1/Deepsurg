import { GlobeMarker, GlobeRegion } from '../shared/globe/globe';

export interface Person {
  name: string;
  role: string;
  /** Empty when we have no photograph; the initials stand in. */
  photo: string;
  initials: string;
}

export interface Partner {
  name: string;
  logo: string;
}

export interface Office extends GlobeMarker {
  country: string;
  city: string;
  address: string;
}

export const TEAM: readonly Person[] = [
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

export const PARTNERS: readonly Partner[] = [
  { name: 'Istanbul University — Faculty of Medicine', logo: 'partners/istanbul-faculty-of-medicine.webp' },
  { name: 'İstanbul Üniversitesi', logo: 'partners/istanbul-universitesi.webp' },
  { name: 'Clínic Barcelona', logo: 'partners/clinic-barcelona.webp' },
  { name: 'Universitat Autònoma de Barcelona', logo: 'partners/universitat-autonoma-barcelona.webp' },
  { name: 'Universitat de Barcelona', logo: 'partners/universitat-barcelona.webp' },
];

/** Pinned on the globe; lat/lon are the office cities themselves. */
export const OFFICES: readonly Office[] = [
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
export const SITES: readonly GlobeRegion[] = [
  { code: 'TUR', label: 'Türkiye' },
  { code: 'SAU', label: 'Saudi Arabia' },
  { code: 'ESP', label: 'Spain' },
  { code: 'DNK', label: 'Denmark' },
  { code: 'CHE', label: 'Switzerland' },
  { code: 'HUN', label: 'Hungary' },
  { code: 'CAN', label: 'Canada' },
];
