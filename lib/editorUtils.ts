import type { ZoomKeyframe } from '@/types/editor';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function getZoomAtTime(
  time: number,
  keyframes: ZoomKeyframe[]
): { scale: number; x: number; y: number } {
  if (keyframes.length === 0) return { scale: 1, x: 0.5, y: 0.5 };

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time)
    return { scale: sorted[0].scale, x: sorted[0].x, y: sorted[0].y };

  const last = sorted[sorted.length - 1];
  if (time >= last.time) return { scale: last.scale, x: last.x, y: last.y };

  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      const t = easeInOut(
        (time - sorted[i].time) / (sorted[i + 1].time - sorted[i].time)
      );
      return {
        scale: lerp(sorted[i].scale, sorted[i + 1].scale, t),
        x: lerp(sorted[i].x, sorted[i + 1].x, t),
        y: lerp(sorted[i].y, sorted[i + 1].y, t),
      };
    }
  }

  return { scale: 1, x: 0.5, y: 0.5 };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`;
}
