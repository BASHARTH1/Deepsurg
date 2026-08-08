import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Capability {
  id: string;
  title: string;
  summary: string;
  icon: string;
  tags: string[];
}

export interface Metric {
  label: string;
  value: string;
  caption: string;
}

export interface Milestone {
  phase: string;
  title: string;
  detail: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  organisation: string;
  interest: string;
  message: string;
}

export interface ContactResponse {
  id: string;
  receivedAt: string;
  message: string;
}

/**
 * Talks to the DeepSurg NestJS API. Content endpoints fall back to a local copy
 * so the marketing site still renders if the API is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  capabilities(): Observable<Capability[]> {
    return this.http
      .get<Capability[]>(`${this.base}/company/capabilities`)
      .pipe(catchError(() => of(FALLBACK_CAPABILITIES)));
  }

  metrics(): Observable<Metric[]> {
    return this.http
      .get<Metric[]>(`${this.base}/company/metrics`)
      .pipe(catchError(() => of(FALLBACK_METRICS)));
  }

  milestones(): Observable<Milestone[]> {
    return this.http
      .get<Milestone[]>(`${this.base}/company/milestones`)
      .pipe(catchError(() => of(FALLBACK_MILESTONES)));
  }

  submitContact(payload: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${this.base}/contact`, payload);
  }
}

const FALLBACK_CAPABILITIES: Capability[] = [
  {
    id: 'intraop-vision',
    title: 'Intra-operative vision',
    summary:
      'Frame-by-frame understanding of the surgical field — instruments, anatomy and phase — streamed to the console with sub-second latency.',
    icon: 'eye',
    tags: ['Computer vision', 'Real time'],
  },
  {
    id: 'risk-signal',
    title: 'Risk signal',
    summary:
      'Continuous scoring of intra-operative events, surfacing deviation from the expected course before it becomes a complication.',
    icon: 'pulse',
    tags: ['Decision support'],
  },
  {
    id: 'planning',
    title: 'Pre-operative planning',
    summary:
      'Multimodal models read imaging and history together to propose an approach, and to quantify how confident they are in it.',
    icon: 'layers',
    tags: ['Multimodal', 'Imaging'],
  },
  {
    id: 'debrief',
    title: 'Automated debrief',
    summary:
      'Every case is segmented, timed and indexed, turning an eight-hour recording into a structured record the team can review in minutes.',
    icon: 'chart',
    tags: ['Analytics'],
  },
];

const FALLBACK_METRICS: Metric[] = [
  { label: 'Inference latency', value: '<120ms', caption: 'From capture to on-screen overlay' },
  { label: 'Annotated case hours', value: '40k+', caption: 'Curated by operating surgeons' },
  { label: 'Procedure families', value: '18', caption: 'Modelled end to end' },
  { label: 'Deployment', value: 'On-prem', caption: 'Patient data never leaves the hospital' },
];

const FALLBACK_MILESTONES: Milestone[] = [
  {
    phase: '01',
    title: 'Capture',
    detail:
      'Endoscopic video, vitals and device telemetry are ingested from theatre hardware through a passive, non-intrusive tap.',
  },
  {
    phase: '02',
    title: 'Interpret',
    detail:
      'Our models segment anatomy, track instruments and classify the operative phase on every frame, on hospital hardware.',
  },
  {
    phase: '03',
    title: 'Assist',
    detail:
      'Findings reach the surgical team as calm, glanceable overlays — never an alarm, always with the evidence behind it.',
  },
  {
    phase: '04',
    title: 'Learn',
    detail:
      'Each completed case feeds a reviewed dataset, so performance improves with governance and a full audit trail.',
  },
];
