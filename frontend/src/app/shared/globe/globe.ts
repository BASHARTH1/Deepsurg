import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { COUNTRY_SHAPES } from './country-shapes';
import { WORLD_SHAPES } from './world-shapes';

/** A place to pin on the globe. */
export interface GlobeMarker {
  label: string;
  lat: number;
  lon: number;
  /** Which way the label reads from the pin — used to split crowded pins. */
  side?: 'left' | 'right';
  /** ISO A3 of the country to pick out in red, e.g. 'GBR'. */
  region?: string;
  /** Shown on hover, over the country or the pin. */
  address?: string;
}

/** A country to pick out, without a pin on it. */
export interface GlobeRegion {
  /** ISO A3, e.g. 'TUR'. */
  code: string;
  label: string;
}

/** What the pointer is currently over, in CSS pixels. */
interface Hover {
  title: string;
  detail: string;
  /** Which palette the tooltip heading uses. */
  tone: 'office' | 'partner';
  /** Set when the pointer is on a pin, so the marker can swell. */
  marker?: GlobeMarker;
  x: number;
  y: number;
}

/** How a mask id maps back to what it represents. */
interface RegionRef {
  kind: 'office' | 'partner';
  /** ISO A3 of the country filled for this id. */
  code: string;
  marker?: GlobeMarker;
  title: string;
  detail: string;
}

/** Degrees the north pole is tipped towards the viewer. */
const TILT = 20;
/** Degrees of spin per second. */
const SPIN = 5.5;
const DEG = Math.PI / 180;

/** Equirectangular land mask, in pixels per degree. */
const MASK_PPD = 4;
const MASK_W = 360 * MASK_PPD;
const MASK_H = 180 * MASK_PPD;

/** Cap on the sphere's pixel buffer, so retina screens stay cheap to redraw. */
const BUFFER_MAX = 700;

const OCEAN: [number, number, number] = [233, 237, 252];
const LAND: [number, number, number] = [30, 28, 198];
/** The countries DeepSurg sits in. */
const HOME: [number, number, number] = [225, 40, 52];
/** Partnership and project sites. */
const PARTNER: [number, number, number] = [139, 92, 246];

/** How near the pointer has to get to a pin, in CSS pixels, to count as over it. */
const HOVER_REACH = 16;

/** A point resolved onto the screen, with its depth towards the viewer. */
interface Projected {
  x: number;
  y: number;
  /** 1 dead centre, 0 on the silhouette, negative round the back. */
  depth: number;
}

/**
 * A slowly turning globe with solid continents.
 *
 * The sphere is raster, not vector: coastlines are filled once into an
 * equirectangular mask, then every frame each pixel of the disc is traced back
 * to the lat/lon under it and coloured from that mask. Because spinning only
 * shifts longitude, the expensive per-pixel geometry — latitude, base longitude
 * and shading — is computed once per resize and reused, so a frame costs one
 * lookup per pixel. Occlusion is exact, with none of the fold-over that
 * clipping filled polygons at the horizon would bring.
 *
 * Markers ride the surface and fade as they turn round the back. Drag to spin
 * it; freezes with Europe facing the viewer when reduced motion is preferred.
 */
@Component({
  selector: 'ds-globe',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #canvas [attr.aria-label]="caption()" role="img"></canvas>

    @if (hover(); as spot) {
      <div class="tip" [class.tip--partner]="spot.tone === 'partner'"
           [style.left.px]="spot.x" [style.top.px]="spot.y">
        <strong>{{ spot.title }}</strong>
        @if (spot.detail) {
          <span>{{ spot.detail }}</span>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        width: 100%;
        max-width: 560px;
        margin-inline: auto;
        aspect-ratio: 1 / 1;
        touch-action: pan-y;
        cursor: grab;
      }

      :host(:active) {
        cursor: grabbing;
      }

      canvas {
        width: 100%;
        height: 100%;
      }

      .tip {
        position: absolute;
        z-index: 2;
        /* Sits just above the pointer, centred on it. */
        transform: translate(-50%, calc(-100% - 14px));
        width: max-content;
        max-width: 230px;
        padding: 10px 13px;
        border-radius: 12px;
        border: 1px solid var(--ds-blue-100, #dcdbf8);
        background: #fff;
        box-shadow: 0 2px 6px rgba(11, 18, 32, 0.06), 0 16px 34px rgba(26, 24, 190, 0.16);
        pointer-events: none;
        text-align: left;
      }

      .tip strong {
        display: block;
        font-size: 0.82rem;
        color: #e12834;
      }

      .tip--partner strong {
        color: #7c3aed;
      }

      .tip span {
        display: block;
        margin-top: 3px;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--ds-slate, #475569);
      }
    `,
  ],
})
export class Globe implements AfterViewInit, OnDestroy {
  readonly markers = input<readonly GlobeMarker[]>([]);
  /** Countries to tint without pinning — partnership and project sites. */
  readonly regions = input<readonly GlobeRegion[]>([]);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>);

  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private radius = 0;

  /** What the pointer is over, if anything. */
  protected readonly hover = signal<Hover | null>(null);

  /** Land mask: one byte per equirectangular cell, 255 where there is land. */
  private mask: Uint8Array | null = null;

  /** Region mask: 0 for nowhere, otherwise an id into `regionRefs`. */
  private regionMask: Uint8Array | null = null;
  /** Indexed by mask id minus one. */
  private regionRefs: RegionRef[] = [];

  /** Offscreen buffer the sphere is painted into, then blitted up to size. */
  private buffer: HTMLCanvasElement | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;
  private image: ImageData | null = null;
  private bufferSize = 0;

  /** Per-pixel geometry, rebuilt on resize. Indexed by buffer pixel. */
  private lonBase: Float32Array | null = null;
  private maskRow: Int32Array | null = null;
  private shade: Uint8Array | null = null;

  /** Colour ramps indexed by shade, so a frame needs no arithmetic. */
  private readonly oceanRamp = ramp(OCEAN);
  private readonly landRamp = ramp(LAND);
  private readonly homeRamp = ramp(HOME);
  private readonly partnerRamp = ramp(PARTNER);

  /** Longitude sitting dead centre. Starts on Europe. */
  private rotation = -2;
  private clock = 0;
  private lastTs = 0;
  private frame = 0;

  private dragging = false;
  private dragX = 0;
  private observer?: ResizeObserver;

  protected caption(): string {
    const offices = this.markers().map((m) => m.label);
    const sites = this.regions().map((r) => r.label);
    if (!offices.length && !sites.length) {
      return 'Rotating globe';
    }

    const parts = [];
    if (offices.length) {
      parts.push(`offices in ${offices.join(' and ')}`);
    }
    if (sites.length) {
      parts.push(`partnership and project sites in ${sites.join(', ')}`);
    }
    return `Rotating globe marking DeepSurg ${parts.join(', and ')}`;
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }

    this.buildMask();
    this.resize();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host.nativeElement);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.zone.runOutsideAngular(() => {
      this.host.nativeElement.addEventListener('pointerdown', this.onDown);
      this.host.nativeElement.addEventListener('pointerleave', this.onLeave);
      window.addEventListener('pointermove', this.onMove, { passive: true });
      window.addEventListener('pointerup', this.onUp);

      if (still) {
        this.draw();
        return;
      }

      this.lastTs = performance.now();
      this.frame = requestAnimationFrame((ts) => this.tick(ts));
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.host.nativeElement.removeEventListener('pointerdown', this.onDown);
    this.host.nativeElement.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
  }

  // ------------------------------------------------------------------- input

  private readonly onDown = (event: PointerEvent) => {
    this.dragging = true;
    this.dragX = event.clientX;
  };

  private readonly onMove = (event: PointerEvent) => {
    if (this.dragging) {
      // A drag across the globe's width turns it about a quarter revolution.
      this.rotation += ((event.clientX - this.dragX) / Math.max(this.radius, 1)) * 90;
      this.dragX = event.clientX;
    }

    this.track(event);
  };

  private readonly onUp = () => {
    this.dragging = false;
  };

  private readonly onLeave = () => {
    this.setHover(null);
  };

  /** Works out which office, if any, sits under the pointer. */
  private track(event: PointerEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      this.setHover(null);
      return;
    }

    // A pin is a handful of pixels across, so give the pointer some reach —
    // otherwise the countries would be near impossible to hit at globe scale.
    let nearest: GlobeMarker | null = null;
    let best = HOVER_REACH;
    for (const marker of this.markers()) {
      const p = this.project(marker.lat, marker.lon);
      if (p.depth <= 0.06) {
        continue;
      }
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < best) {
        best = d;
        nearest = marker;
      }
    }

    if (nearest) {
      this.setHover({
        title: nearest.label,
        detail: nearest.address ?? '',
        tone: 'office',
        marker: nearest,
        x,
        y,
      });
      return;
    }

    // Otherwise, whichever highlighted country is under the pointer.
    const spot = this.locate(x, y);
    const id = spot !== null && this.regionMask ? this.regionMask[spot] : 0;
    const ref = id ? this.regionRefs[id - 1] : undefined;

    this.setHover(
      ref ? { title: ref.title, detail: ref.detail, tone: ref.kind, marker: ref.marker, x, y } : null,
    );
  }

  /** Canvas point to a cell in the equirectangular masks, or null off-globe. */
  private locate(x: number, y: number): number | null {
    const r = this.radius;
    const nx = (x - this.width / 2) / r;
    const ny = (this.height / 2 - y) / r;
    const d2 = nx * nx + ny * ny;
    if (d2 > 1) {
      return null;
    }

    const nz = Math.sqrt(1 - d2);
    const t = TILT * DEG;
    const gy = ny * Math.cos(t) + nz * Math.sin(t);
    const gz = -ny * Math.sin(t) + nz * Math.cos(t);

    const lat = Math.asin(Math.max(-1, Math.min(1, gy))) / DEG;
    let lon = Math.atan2(nx, gz) / DEG - this.rotation;
    lon -= Math.floor((lon + 180) / 360) * 360;

    const row = Math.min(MASK_H - 1, Math.max(0, Math.floor((90 - lat) * MASK_PPD)));
    const col = Math.min(MASK_W - 1, ((lon + 180) * MASK_PPD) | 0);
    return row * MASK_W + col;
  }

  /** Hover drives the template, so changes have to land back in the zone. */
  private setHover(next: Hover | null): void {
    const current = this.hover();
    if (!next && !current) {
      return;
    }
    if (
      next &&
      current &&
      next.title === current.title &&
      next.x === current.x &&
      next.y === current.y
    ) {
      return;
    }
    this.zone.run(() => this.hover.set(next));
  }

  // -------------------------------------------------------------------- land

  /** Fills the coastlines flat, where a polygon can never cross the horizon. */
  private buildMask(): void {
    const flat = document.createElement('canvas');
    flat.width = MASK_W;
    flat.height = MASK_H;

    const ctx = flat.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return;
    }

    const trace = (ring: readonly number[]) => {
      ctx.beginPath();
      for (let i = 0; i < ring.length; i += 2) {
        const x = (ring[i] + 180) * MASK_PPD;
        const y = (90 - ring[i + 1]) * MASK_PPD;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    };

    ctx.fillStyle = '#fff';
    for (const ring of WORLD_SHAPES) {
      trace(ring);
    }

    const rgba = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
    const mask = new Uint8Array(MASK_W * MASK_H);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = rgba[i * 4 + 3];
    }
    this.mask = mask;

    // Second pass for the countries worth picking out. Each is filled on its
    // own so the mask can say which one a pixel belongs to.
    const refs: RegionRef[] = [
      ...this.markers()
        .filter((marker) => marker.region)
        .map((marker) => ({
          kind: 'office' as const,
          marker,
          code: marker.region as string,
          title: marker.label,
          detail: marker.address ?? '',
        })),
      ...this.regions().map((region) => ({
        kind: 'partner' as const,
        code: region.code,
        title: region.label,
        detail: 'Partnership and project site',
      })),
    ];

    const regionMask = new Uint8Array(MASK_W * MASK_H);
    let marked = false;

    refs.forEach((ref, index) => {
      const rings = COUNTRY_SHAPES.filter((shape) => shape.code === ref.code);
      if (!rings.length) {
        return;
      }

      ctx.clearRect(0, 0, MASK_W, MASK_H);
      for (const shape of rings) {
        trace(shape.ring);
      }

      const painted = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
      for (let i = 0; i < regionMask.length; i++) {
        if (painted[i * 4 + 3] > 127) {
          regionMask[i] = index + 1;
          marked = true;
        }
      }
    });

    this.regionRefs = refs;
    this.regionMask = marked ? regionMask : null;
  }

  // ------------------------------------------------------------------ canvas

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = Math.max(rect.width, 1);
    this.height = Math.max(rect.height, 1);
    canvas.width = Math.round(this.width * dpr);
    canvas.height = Math.round(this.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Leave room round the edge for marker labels.
    this.radius = Math.min(this.width, this.height) / 2 - 14;
    this.buildGeometry(Math.min(Math.round(this.radius * 2 * dpr), BUFFER_MAX));
    this.draw();
  }

  /**
   * Traces every pixel of the disc back to the sphere. Latitude and shading are
   * fixed for a given size; only longitude moves as the globe turns, so that is
   * all a frame has to add.
   */
  private buildGeometry(size: number): void {
    const px = Math.max(size, 32);
    this.bufferSize = px;

    if (!this.buffer) {
      this.buffer = document.createElement('canvas');
      this.bufferCtx = this.buffer.getContext('2d');
    }
    this.buffer.width = px;
    this.buffer.height = px;
    this.image = this.bufferCtx?.createImageData(px, px) ?? null;

    const lonBase = new Float32Array(px * px);
    const maskRow = new Int32Array(px * px);
    const shade = new Uint8Array(px * px);

    const t = TILT * DEG;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    // Light from the upper left, slightly towards the viewer.
    const lx = -0.42;
    const ly = 0.46;
    const lz = 0.78;

    const r = px / 2;
    for (let py = 0; py < px; py++) {
      for (let pxi = 0; pxi < px; pxi++) {
        const i = py * px + pxi;
        const nx = (pxi + 0.5 - r) / r;
        const ny = (r - py - 0.5) / r;
        const d2 = nx * nx + ny * ny;
        if (d2 > 1) {
          maskRow[i] = -1;
          continue;
        }

        const nz = Math.sqrt(1 - d2);

        // Undo the tilt to get the point in the globe's own frame.
        const y = ny * cosT + nz * sinT;
        const z = -ny * sinT + nz * cosT;
        const lat = Math.asin(Math.max(-1, Math.min(1, y))) / DEG;

        let row = Math.floor((90 - lat) * MASK_PPD);
        row = row < 0 ? 0 : row > MASK_H - 1 ? MASK_H - 1 : row;

        lonBase[i] = Math.atan2(nx, z) / DEG;
        maskRow[i] = row * MASK_W;

        const lambert = nx * lx + ny * ly + nz * lz;
        const level = 0.58 + 0.42 * Math.max(lambert, 0) + 0.12 * nz;
        shade[i] = Math.max(0, Math.min(255, Math.round(level * 200)));
      }
    }

    this.lonBase = lonBase;
    this.maskRow = maskRow;
    this.shade = shade;
  }

  private tick(ts: number): void {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;
    this.clock += dt;
    if (!this.dragging) {
      this.rotation += SPIN * dt;
    }

    this.draw();
    this.frame = requestAnimationFrame((next) => this.tick(next));
  }

  /** Orthographic projection: lat/lon on the sphere to a point on the canvas. */
  private project(lat: number, lon: number): Projected {
    const phi = lat * DEG;
    const lambda = (lon + this.rotation) * DEG;
    const t = TILT * DEG;

    const x = Math.cos(phi) * Math.sin(lambda);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(lambda);

    const yt = y * Math.cos(t) - z * Math.sin(t);
    const zt = y * Math.sin(t) + z * Math.cos(t);

    return {
      x: this.width / 2 + x * this.radius,
      y: this.height / 2 - yt * this.radius,
      depth: zt,
    };
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.width, this.height);
    this.drawSphere(ctx);
    this.drawGraticule(ctx);
    this.drawMarkers(ctx);
  }

  private drawSphere(ctx: CanvasRenderingContext2D): void {
    const { mask, lonBase, maskRow, shade, image, buffer, bufferCtx } = this;
    if (!mask || !lonBase || !maskRow || !shade || !image || !buffer || !bufferCtx) {
      return;
    }

    const data = image.data;
    const rot = this.rotation;
    const count = maskRow.length;

    for (let i = 0; i < count; i++) {
      const row = maskRow[i];
      const o = i * 4;
      if (row < 0) {
        data[o + 3] = 0;
        continue;
      }

      // Spinning is a longitude shift, so the geometry above still holds.
      let lon = lonBase[i] - rot;
      lon -= Math.floor((lon + 180) / 360) * 360;

      const col = ((lon + 180) * MASK_PPD) | 0;
      const cell = row + (col < MASK_W ? col : MASK_W - 1);
      const region = this.regionMask?.[cell];
      const ramp = region
        ? this.regionRefs[region - 1]?.kind === 'partner'
          ? this.partnerRamp
          : this.homeRamp
        : mask[cell] > 127
          ? this.landRamp
          : this.oceanRamp;

      const s = shade[i] * 3;
      data[o] = ramp[s];
      data[o + 1] = ramp[s + 1];
      data[o + 2] = ramp[s + 2];
      data[o + 3] = 255;
    }

    bufferCtx.putImageData(image, 0, 0);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = this.radius;

    // Soft shadow under the ball, then the ball itself.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(20, 17, 154, 0.28)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buffer, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(20, 17, 154, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Meridians and parallels — faint scaffolding over the ocean. */
  private drawGraticule(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(20, 17, 154, 0.10)';
    ctx.lineWidth = 1;

    const trace = (points: Array<[number, number]>) => {
      ctx.beginPath();
      let lifted = true;
      for (const [lat, lon] of points) {
        const p = this.project(lat, lon);
        if (p.depth <= 0) {
          lifted = true;
          continue;
        }
        if (lifted) {
          ctx.moveTo(p.x, p.y);
          lifted = false;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    };

    for (let lon = -180; lon < 180; lon += 30) {
      const line: Array<[number, number]> = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        line.push([lat, lon]);
      }
      trace(line);
    }

    for (let lat = -60; lat <= 60; lat += 30) {
      const line: Array<[number, number]> = [];
      for (let lon = -180; lon <= 180; lon += 3) {
        line.push([lat, lon]);
      }
      trace(line);
    }
  }

  private drawMarkers(ctx: CanvasRenderingContext2D): void {
    const pulse = (Math.sin(this.clock * 2.2) + 1) / 2;

    for (const marker of this.markers()) {
      const p = this.project(marker.lat, marker.lon);
      if (p.depth <= 0.06) {
        continue;
      }

      const alpha = Math.min(p.depth * 1.6, 1);

      const lit = this.hover()?.marker === marker;

      // Halo, breathing in and out, in the same red as the country below it.
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + pulse * 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(225, 40, 52, ${(0.34 * (1 - pulse) * alpha).toFixed(3)})`;
      ctx.fill();

      // The pin is a ring rather than a dot, so it circles the red country
      // instead of hiding it — the Netherlands is only a few pixels across.
      const ring = lit ? 10 : 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.85 * alpha).toFixed(3)})`;
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = `rgba(225, 40, 52, ${alpha.toFixed(3)})`;
      ctx.stroke();

      // Label, set off to whichever side keeps neighbouring pins legible.
      const left = marker.side === 'left';
      const tx = p.x + (left ? -(ring + 6) : ring + 6);
      ctx.font = '600 12px Inter, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = left ? 'right' : 'left';
      ctx.textBaseline = 'middle';

      // Heavy white casing, so the label survives sitting over a landmass.
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`;
      ctx.strokeText(marker.label, tx, p.y);
      ctx.fillStyle = `rgba(20, 17, 154, ${alpha.toFixed(3)})`;
      ctx.fillText(marker.label, tx, p.y);
    }
  }
}

/** 256 shaded steps of one colour, flattened to [r, g, b, r, g, b, ...]. */
function ramp([r, g, b]: [number, number, number]): Uint8Array {
  const out = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const k = i / 200;
    out[i * 3] = Math.min(255, Math.round(r * k));
    out[i * 3 + 1] = Math.min(255, Math.round(g * k));
    out[i * 3 + 2] = Math.min(255, Math.round(b * k));
  }
  return out;
}
