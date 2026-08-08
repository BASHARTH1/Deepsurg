import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  input,
  viewChild,
} from '@angular/core';

/** A neuron soma: a junction where axons meet. */
interface Neuron {
  /** Resting position — the drift oscillates around this. */
  bx: number;
  by: number;
  x: number;
  y: number;
  r: number;
  /** Offsets this neuron's drift so the field does not pulse in unison. */
  phase: number;
  amp: number;
  edges: number[];
  /** 0..1, flares when an impulse arrives, then decays. */
  flash: number;
}

/** An axon: a curved link between two neurons. */
interface Axon {
  a: number;
  b: number;
  /** How far the curve bows off the straight line, as a fraction of its length. */
  bend: number;
  /** Quadratic control point, recomputed each frame as the neurons drift. */
  cx: number;
  cy: number;
  length: number;
  /** Midpoint, cached for the sweep test. */
  mx: number;
  my: number;
}

/** An action potential travelling down an axon. */
interface Impulse {
  axon: number;
  /** Travelling a -> b when true. */
  forward: boolean;
  /** Normalised head position along the axon, 0..1. */
  t: number;
  /** Units of axon length per second. */
  speed: number;
  hops: number;
  /** Picks the shade of blue this impulse fires in. */
  tone: number;
}

/** Neurotransmitter scatter, thrown off at a synapse. */
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/** Expanding shockwave from a neuron firing in every direction at once. */
interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
}

const AXON_STROKE = 'rgba(26, 24, 190, 0.18)';
const NEURON_FILL = 'rgba(26, 24, 190, 0.28)';
/** Shades of the DeepSurg brand blue. */
const TONES: Array<[number, number, number]> = [
  [20, 17, 154], // deep
  [26, 24, 190], // brand
  [61, 59, 212], // light
];

/** Half-width of the depolarisation sweep, in pixels. */
const SWEEP_BAND = 230;
const MAX_SPARKS = 160;

/**
 * Animated "nerve impulse" backdrop: a resting network of neurons and axons over
 * white, alive with several layers of motion —
 *   · action potentials relaying from axon to axon, trailing a glow
 *   · myelin ticks lighting up ahead of each impulse (saltatory conduction)
 *   · the whole network drifting and breathing at rest
 *   · a slow depolarisation wave sweeping across the field
 *   · synaptic sparks scattered at each junction the signal crosses
 *   · occasional burst events, where one neuron fires down every axon at once
 *   · a touch of parallax that follows the pointer
 *
 * Runs on canvas outside the Angular zone; freezes to a single static frame when
 * the visitor prefers reduced motion.
 */
@Component({
  selector: 'ds-nerve-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas aria-hidden="true"></canvas>`,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
        overflow: hidden;
        pointer-events: none;
        background:
          radial-gradient(120% 90% at 78% 8%, rgba(139, 92, 246, 0.07) 0%, rgba(255, 255, 255, 0) 52%),
          radial-gradient(100% 80% at 8% 22%, rgba(26, 24, 190, 0.08) 0%, rgba(255, 255, 255, 0) 55%),
          linear-gradient(180deg, #ffffff 0%, #fafaff 48%, #ffffff 100%);
      }

      canvas {
        width: 100%;
        height: 100%;
      }

      /* Fades the network into the page so text stays comfortable to read. */
      :host::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.72) 100%);
      }
    `,
  ],
})
export class NerveBackground implements AfterViewInit, OnDestroy {
  /** Roughly how many impulses are alive at once. */
  readonly density = input(1);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>);

  private ctx: CanvasRenderingContext2D | null = null;
  private neurons: Neuron[] = [];
  private axons: Axon[] = [];
  private impulses: Impulse[] = [];
  private sparks: Spark[] = [];
  private rings: Ring[] = [];

  private width = 0;
  private height = 0;
  private frame = 0;
  private lastTs = 0;
  private clock = 0;

  /** Leading edge of the depolarisation sweep. */
  private sweepX = 0;
  /** Seconds until the next all-directions burst. */
  private burstIn = 3;

  private pointerX = 0;
  private pointerY = 0;
  private parallaxX = 0;
  private parallaxY = 0;

  private observer?: ResizeObserver;
  private readonly onPointerMove = (event: PointerEvent) => {
    // -1..1 across the viewport, so the parallax reads the same on any screen.
    this.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
  };

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }

    this.resize();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host.nativeElement);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      this.settle();
      this.draw();
      return;
    }

    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      this.lastTs = performance.now();
      this.frame = requestAnimationFrame((ts) => this.tick(ts));
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
  }

  // ---------------------------------------------------------------- network

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = Math.max(rect.width, 1);
    this.height = Math.max(rect.height, 1);
    canvas.width = Math.round(this.width * dpr);
    canvas.height = Math.round(this.height * dpr);

    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.build();
  }

  /** Lays out neurons on a jittered grid and wires nearby ones together. */
  private build(): void {
    const cell = this.width < 720 ? 108 : 128;
    const cols = Math.max(Math.ceil(this.width / cell) + 1, 3);
    const rows = Math.max(Math.ceil(this.height / cell) + 1, 3);

    this.neurons = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.neurons.push({
          bx: (col - 0.5) * cell + (Math.random() - 0.5) * cell * 0.72,
          by: (row - 0.5) * cell + (Math.random() - 0.5) * cell * 0.72,
          x: 0,
          y: 0,
          r: 1.2 + Math.random() * 1.9,
          phase: Math.random() * Math.PI * 2,
          amp: 2.5 + Math.random() * 4,
          edges: [],
          flash: 0,
        });
      }
    }
    this.settle();

    this.axons = [];
    const reach = cell * 1.32;
    const seen = new Set<string>();

    for (let i = 0; i < this.neurons.length; i++) {
      const near = this.neurons
        .map((n, j) => ({ j, d: Math.hypot(n.x - this.neurons[i].x, n.y - this.neurons[i].y) }))
        .filter((c) => c.j !== i && c.d < reach)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);

      for (const { j } of near) {
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const a = this.neurons[i];
        const b = this.neurons[j];
        const index =
          this.axons.push({
            a: i,
            b: j,
            bend: (Math.random() - 0.5) * 0.34,
            cx: 0,
            cy: 0,
            length: Math.hypot(b.x - a.x, b.y - a.y),
            mx: 0,
            my: 0,
          }) - 1;

        a.edges.push(index);
        b.edges.push(index);
      }
    }
    this.reshape();

    const target = Math.round(
      Math.min(34, Math.max(8, (this.width * this.height) / 42000)) * this.density(),
    );
    this.impulses = [];
    for (let i = 0; i < target; i++) {
      const seed = this.spawn();
      if (seed) {
        // Stagger the start so they do not all fire from the same line.
        seed.t = Math.random();
        this.impulses.push(seed);
      }
    }

    this.sparks = [];
    this.rings = [];
    this.sweepX = -SWEEP_BAND;
  }

  /** Moves every neuron to where its drift puts it at the current time. */
  private settle(): void {
    for (const n of this.neurons) {
      n.x = n.bx + Math.sin(this.clock * 0.34 + n.phase) * n.amp;
      n.y = n.by + Math.cos(this.clock * 0.29 + n.phase * 1.3) * n.amp * 0.8;
    }
  }

  /** Re-derives each axon's control point from the neurons it now connects. */
  private reshape(): void {
    for (const axon of this.axons) {
      const a = this.neurons[axon.a];
      const b = this.neurons[axon.b];
      axon.mx = (a.x + b.x) / 2;
      axon.my = (a.y + b.y) / 2;
      // Push the midpoint along the edge normal so the axon curves.
      axon.cx = axon.mx + (b.y - a.y) * axon.bend;
      axon.cy = axon.my - (b.x - a.x) * axon.bend;
      axon.length = Math.hypot(b.x - a.x, b.y - a.y);
    }
  }

  private spawn(): Impulse | null {
    if (!this.axons.length) {
      return null;
    }
    return {
      axon: Math.floor(Math.random() * this.axons.length),
      forward: Math.random() < 0.5,
      t: 0,
      speed: 0.22 + Math.random() * 0.34,
      hops: 0,
      tone: Math.random(),
    };
  }

  /** Hands the impulse to a neighbouring axon at the neuron it just reached. */
  private relay(impulse: Impulse): void {
    const axon = this.axons[impulse.axon];
    const arrivedAt = impulse.forward ? axon.b : axon.a;
    const neuron = this.neurons[arrivedAt];
    neuron.flash = 1;

    if (Math.random() < 0.4) {
      this.scatter(neuron.x, neuron.y, 5, 34);
    }

    const onward = neuron.edges.filter((e) => e !== impulse.axon);
    if (!onward.length || impulse.hops > 14) {
      const fresh = this.spawn();
      if (fresh) {
        Object.assign(impulse, fresh);
      }
      return;
    }

    const next = onward[Math.floor(Math.random() * onward.length)];
    impulse.axon = next;
    impulse.forward = this.axons[next].a === arrivedAt;
    impulse.t = 0;
    impulse.hops++;
  }

  /** Throws a handful of short-lived particles out from a synapse. */
  private scatter(x: number, y: number, count: number, speed: number): void {
    if (this.sparks.length > MAX_SPARKS) {
      return;
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.9);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 1,
      });
    }
  }

  /** One neuron depolarises hard: every axon around it carries signal outward. */
  private burst(): void {
    const candidates = this.neurons.filter((n) => n.edges.length >= 2);
    if (!candidates.length || !this.impulses.length) {
      return;
    }

    const neuron = candidates[Math.floor(Math.random() * candidates.length)];
    const index = this.neurons.indexOf(neuron);
    neuron.flash = 1;

    this.rings.push({ x: neuron.x, y: neuron.y, r: neuron.r + 2, life: 1 });
    this.scatter(neuron.x, neuron.y, 14, 58);

    // Re-aim existing impulses rather than adding more, so the traffic stays level.
    const outgoing = neuron.edges.slice(0, 4);
    for (let i = 0; i < outgoing.length; i++) {
      const impulse = this.impulses[Math.floor(Math.random() * this.impulses.length)];
      impulse.axon = outgoing[i];
      impulse.forward = this.axons[outgoing[i]].a === index;
      impulse.t = 0;
      impulse.hops = 0;
      impulse.speed = 0.34 + Math.random() * 0.3;
    }
  }

  // ----------------------------------------------------------------- render

  private tick(ts: number): void {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;
    this.clock += dt;

    this.settle();
    this.reshape();

    for (const impulse of this.impulses) {
      impulse.t += impulse.speed * dt;
      if (impulse.t >= 1) {
        this.relay(impulse);
      }
    }

    for (const neuron of this.neurons) {
      neuron.flash = Math.max(0, neuron.flash - dt * 1.8);
    }

    // Depolarisation wave, crossing the field and looping back round.
    this.sweepX += dt * 190;
    if (this.sweepX > this.width + SWEEP_BAND) {
      this.sweepX = -SWEEP_BAND;
    }

    this.burstIn -= dt;
    if (this.burstIn <= 0) {
      this.burst();
      this.burstIn = 4.5 + Math.random() * 4.5;
    }

    for (const spark of this.sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.94;
      spark.vy *= 0.94;
      spark.life -= dt * 1.15;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    for (const ring of this.rings) {
      ring.r += dt * 130;
      ring.life -= dt * 0.9;
    }
    this.rings = this.rings.filter((r) => r.life > 0);

    // Ease toward the pointer instead of snapping to it.
    this.parallaxX += (this.pointerX * 12 - this.parallaxX) * Math.min(dt * 2.4, 1);
    this.parallaxY += (this.pointerY * 8 - this.parallaxY) * Math.min(dt * 2.4, 1);

    this.draw();
    this.frame = requestAnimationFrame((next) => this.tick(next));
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.parallaxX, this.parallaxY);

    // Resting axons.
    ctx.lineWidth = 1;
    ctx.strokeStyle = AXON_STROKE;
    ctx.beginPath();
    for (const axon of this.axons) {
      const a = this.neurons[axon.a];
      const b = this.neurons[axon.b];
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(axon.cx, axon.cy, b.x, b.y);
    }
    ctx.stroke();

    this.drawSweep(ctx);

    // Burst shockwaves.
    for (const ring of this.rings) {
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(26, 24, 190, ${(ring.life * 0.3).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Somas, brightening as signal passes through them.
    for (const neuron of this.neurons) {
      ctx.beginPath();
      ctx.arc(neuron.x, neuron.y, neuron.r + neuron.flash * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = neuron.flash
        ? `rgba(20, 17, 154, ${0.25 + neuron.flash * 0.6})`
        : NEURON_FILL;
      ctx.fill();

      if (neuron.flash > 0.05) {
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, neuron.r + 4 + (1 - neuron.flash) * 12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(61, 59, 212, ${neuron.flash * 0.4})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }

    for (const impulse of this.impulses) {
      this.drawMyelin(ctx, impulse);
      this.drawImpulse(ctx, impulse);
    }

    for (const spark of this.sparks) {
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 1.1 + spark.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(61, 59, 212, ${(spark.life * 0.55).toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore();
  }

  /** Brightens the axons the depolarisation wave is currently passing over. */
  private drawSweep(ctx: CanvasRenderingContext2D): void {
    for (const axon of this.axons) {
      const distance = Math.abs(axon.mx - this.sweepX);
      if (distance > SWEEP_BAND) {
        continue;
      }

      const strength = 1 - distance / SWEEP_BAND;
      const a = this.neurons[axon.a];
      const b = this.neurons[axon.b];

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(axon.cx, axon.cy, b.x, b.y);
      ctx.strokeStyle = `rgba(26, 24, 190, ${(strength * strength * 0.26).toFixed(3)})`;
      ctx.lineWidth = 1 + strength * 0.8;
      ctx.stroke();
    }
  }

  /**
   * Nodes of Ranvier: ticks across the axon that light as the impulse nears them,
   * so the signal reads as jumping between them rather than sliding.
   */
  private drawMyelin(ctx: CanvasRenderingContext2D, impulse: Impulse): void {
    const axon = this.axons[impulse.axon];
    if (axon.length < 70) {
      return;
    }

    const a = this.neurons[axon.a];
    const b = this.neurons[axon.b];
    const head = this.param(impulse, impulse.t);

    for (let u = 0.18; u < 0.92; u += 0.16) {
      const near = 1 - Math.min(Math.abs(u - head) / 0.2, 1);
      if (near <= 0.02) {
        continue;
      }

      const point = this.pointAt(a, b, axon, u);
      const tx = 2 * (1 - u) * (axon.cx - a.x) + 2 * u * (b.x - axon.cx);
      const ty = 2 * (1 - u) * (axon.cy - a.y) + 2 * u * (b.y - axon.cy);
      const len = Math.hypot(tx, ty) || 1;
      const nx = (-ty / len) * (2.2 + near * 2.4);
      const ny = (tx / len) * (2.2 + near * 2.4);

      ctx.beginPath();
      ctx.moveTo(point.x - nx, point.y - ny);
      ctx.lineTo(point.x + nx, point.y + ny);
      ctx.strokeStyle = `rgba(26, 24, 190, ${(near * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  /** Draws the depolarisation wave: a bright head with a tapering tail behind it. */
  private drawImpulse(ctx: CanvasRenderingContext2D, impulse: Impulse): void {
    const axon = this.axons[impulse.axon];
    const a = this.neurons[axon.a];
    const b = this.neurons[axon.b];

    // Longer axons keep a proportionally shorter tail so the wave reads consistently.
    const tail = Math.min(0.45, 62 / Math.max(axon.length, 1));
    const head = impulse.t;
    const start = Math.max(0, head - tail);

    const [r, g, bl] = this.toneColor(impulse.tone);
    const steps = 12;
    let prev = this.pointAt(a, b, axon, this.param(impulse, start));

    ctx.lineCap = 'round';
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const u = start + (head - start) * k;
      const point = this.pointAt(a, b, axon, this.param(impulse, u));

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${(k * k * 0.85).toFixed(3)})`;
      ctx.lineWidth = 0.6 + k * 1.9;
      ctx.stroke();

      prev = point;
    }

    // The action potential itself.
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = `rgba(${r}, ${g}, ${bl}, 0.65)`;
    ctx.beginPath();
    ctx.arc(prev.x, prev.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, 0.95)`;
    ctx.fill();
    ctx.restore();
  }

  /** Maps travel progress to a curve parameter, respecting direction. */
  private param(impulse: Impulse, travelled: number): number {
    return impulse.forward ? travelled : 1 - travelled;
  }

  private pointAt(a: Neuron, b: Neuron, axon: Axon, u: number): { x: number; y: number } {
    const inv = 1 - u;
    return {
      x: inv * inv * a.x + 2 * inv * u * axon.cx + u * u * b.x,
      y: inv * inv * a.y + 2 * inv * u * axon.cy + u * u * b.y,
    };
  }

  private toneColor(tone: number): [number, number, number] {
    // Varying the depth of blue keeps the network from reading as one flat colour.
    return tone < 0.34 ? TONES[0] : tone < 0.72 ? TONES[1] : TONES[2];
  }
}
