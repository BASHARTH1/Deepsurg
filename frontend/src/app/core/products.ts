export interface Product {
  id: string;
  name: string;
  /** Full product name, as it should appear in regulatory-facing copy. */
  fullName: string;
  tagline: string;
  /** Picks the inline icon in the template. */
  icon: 'vision' | 'skill';
  summary: string;
  /**
   * Statement of intended use. Regulatory wording — quote it as written, and do
   * not paraphrase it into marketing copy.
   */
  intendedUse?: string;
}

export const PRODUCTS: readonly Product[] = [
  {
    id: 'primo-ai',
    name: 'Primo AI',
    fullName: 'DeepSurg Primo AI',
    tagline: 'Adjunctive visual information, live in the operating room',
    icon: 'vision',
    summary:
      'DeepSurg Primo AI is a software application intended to provide adjunctive visual information during surgical procedures. By utilizing computer vision to analyze standard surgical video feeds in real time, the system annotates and highlights anatomical structures and tissue boundaries.',
    intendedUse:
      "Primo AI is designed to support the surgeon's situational awareness and is exclusively intended for use as a supplementary visualization tool alongside standard-of-care surgical techniques, preoperative imaging, and the surgeon's direct clinical judgment. It is not intended to diagnose, direct surgical interventions, or serve as the primary basis for clinical or therapeutic decision-making.",
  },
  {
    id: 'scala-ai',
    name: 'Scala AI',
    fullName: 'DeepSurg Scala AI',
    tagline: 'Objective, scalable skill feedback for training centres',
    icon: 'skill',
    summary:
      'AI-powered platform for minimally invasive procedures skill — objective, scalable feedback for training and simulation performance centers.',
  },
];
