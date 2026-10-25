import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

const PARTICLE_COUNT_DESKTOP = 40;
const PARTICLE_COUNT_MOBILE = 18;
const MAX_CONNECT_DIST = 140;
const SPEED = 0.3;
const NODE_COLOR = [96, 165, 250] as const;   // blue-400
const LINE_COLOR  = [99, 179, 251] as const;  // slightly lighter blue
const FRAME_MS = 1000 / 30; // 30fps is plenty for a background accent

export default function PlexusCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip animation when user prefers reduced motion or on very small screens
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particleCount =
      window.innerWidth < 768 ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

    // The glow halo used to be rebuilt with createRadialGradient for every
    // particle on every frame — the single most expensive thing in this loop.
    // It is identical each time, so render it once into an offscreen sprite.
    const SPRITE = 64;
    const glow = document.createElement('canvas');
    glow.width = SPRITE;
    glow.height = SPRITE;
    const gctx = glow.getContext('2d');
    if (gctx) {
      const grad = gctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
      grad.addColorStop(0, `rgba(${NODE_COLOR[0]},${NODE_COLOR[1]},${NODE_COLOR[2]},0.35)`);
      grad.addColorStop(1, `rgba(${NODE_COLOR[0]},${NODE_COLOR[1]},${NODE_COLOR[2]},0)`);
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, SPRITE, SPRITE);
    }

    // Pause the loop while the canvas is scrolled out of view or the tab is
    // hidden — background animation must never steal input-ready main-thread time.
    let inView = true;
    const io = ('IntersectionObserver' in window)
      ? new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; })
      : null;
    if (io) io.observe(canvas);

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      init(canvas.width, canvas.height);
    };

    const init = (w: number, h: number) => {
      particles.current = Array.from({ length: particleCount }, () => ({
        x:       Math.random() * w,
        y:       Math.random() * h,
        vx:      (Math.random() - 0.5) * SPEED * 2,
        vy:      (Math.random() - 0.5) * SPEED * 2,
        radius:  Math.random() * 1.8 + 0.8,
        opacity: Math.random() * 0.5 + 0.5,
      }));
    };

    let lastFrame = 0;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);

      if (document.hidden || !inView) { lastFrame = 0; return; }
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const pts = particles.current;

      // Move particles
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      // Draw edges
      ctx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx   = pts[i].x - pts[j].x;
          const dy   = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_CONNECT_DIST) {
            const alpha = (1 - dist / MAX_CONNECT_DIST) * 0.55;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${LINE_COLOR[0]},${LINE_COLOR[1]},${LINE_COLOR[2]},${alpha})`;
            ctx.stroke();
          }
        }
      }

      // Draw nodes (glow sprite + core dot)
      for (const p of pts) {
        const halo = p.radius * 10;
        ctx.globalAlpha = p.opacity;
        ctx.drawImage(glow, p.x - halo / 2, p.y - halo / 2, halo, halo);
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${NODE_COLOR[0]},${NODE_COLOR[1]},${NODE_COLOR[2]},${p.opacity})`;
        ctx.fill();
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      io?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
