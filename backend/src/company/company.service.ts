import { Injectable } from '@nestjs/common';

export interface Capability {
  id: string;
  title: string;
  summary: string;
  icon: 'eye' | 'pulse' | 'layers' | 'chart';
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

/**
 * Marketing content lives here for now — swap this for a CMS or database
 * repository without touching the controller or the Angular client.
 */
@Injectable()
export class CompanyService {
  private readonly CAPABILITIES: Capability[] = [
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

  private readonly METRICS: Metric[] = [
    { label: 'Inference latency', value: '<120ms', caption: 'From capture to on-screen overlay' },
    { label: 'Annotated case hours', value: '40k+', caption: 'Curated by operating surgeons' },
    { label: 'Procedure families', value: '18', caption: 'Modelled end to end' },
    { label: 'Deployment', value: 'On-prem', caption: 'Patient data never leaves the hospital' },
  ];

  private readonly MILESTONES: Milestone[] = [
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

  capabilities(): Capability[] {
    return this.CAPABILITIES;
  }

  metrics(): Metric[] {
    return this.METRICS;
  }

  milestones(): Milestone[] {
    return this.MILESTONES;
  }

  overview() {
    return {
      name: 'DeepSurg',
      tagline: 'AI that reads the operating room.',
      email: 'omar@deepsurg.ai',
      capabilities: this.CAPABILITIES,
      metrics: this.METRICS,
      milestones: this.MILESTONES,
    };
  }
}
